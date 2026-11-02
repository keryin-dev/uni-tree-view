import { computed, ref, shallowRef, toRaw, triggerRef, watch } from "vue";
import { CHECK_STATUS_MAP, DefaultTreeProps } from "./constants";
import type {
  CheckStatus,
  TreeCheckChangePayload,
  TreeDataItem,
  TreeKey,
  TreeModelValue,
  TreeNode,
  TreeProps,
  UniTreeViewProps
} from "./types";

export type TreeViewStateProps = Pick<
  UniTreeViewProps,
  | "data"
  | "treeProps"
  | "filterValue"
  | "filterMethod"
  | "modelValue"
  | "defaultCheckedKeys"
  | "multiple"
  | "checkStrictly"
  | "accordion"
  | "onlyRadioLeaf"
  | "defaultExpandAll"
  | "defaultExpandedKeys"
  | "defaultExpandParent"
  | "expandChecked"
  | "cacheExpandedKeys"
  | "loadMode"
  | "loadApi"
  | "isLeafFn"
  | "alwaysFirstLoad"
  | "checkedDisabled"
  | "packDisabledKey"
>;

export function useTreeViewState(props: TreeViewStateProps) {
  const treeList = ref<TreeNode[]>([]);
  const visibleTreeList = ref<TreeNode[]>([]);
  const matchedTreeList = ref<TreeNode[]>([]);
  const treeVersion = ref(0);
  const reconciledModelValue = shallowRef<{ value: TreeModelValue } | null>(null);
  const pendingCheckChangePayload = shallowRef<TreeCheckChangePayload | null>(null);
  const childrenMap = ref<Map<TreeKey, TreeNode[]>>(new Map());
  const nodeMap = ref<Map<TreeKey, TreeNode>>(new Map());
  // 按节点对象隔离请求，同 key 的替换节点不会复用旧树的加载结果。
  const loadingNodes = new WeakMap<TreeNode, Promise<TreeDataItem[]>>();
  // 只在重建时读写，不参与渲染，无需响应式。
  const cachedExpandedKeys = new Set<TreeKey>();
  // 目标节点尚未加载出来的选中 key 暂存于此，等懒加载补齐节点后再落地为真实选中态。
  let pendingCheckedKeys = new Set<TreeKey>();
  // 上述待选 key 中来自 setCheckedKeys 等命令式调用的子集：落地后需要额外抛出选中事件，
  // 而来自 modelValue / defaultCheckedKeys 的部分属于配置回放，不重复抛事件。
  let pendingImperativeCheckedKeys = new Set<TreeKey>();
  let warnedInvalidKeys = new Set<string>();
  let initialized = false;

  const resolvedTreeProps = computed<TreeProps>(() => {
    return {
      id: props.treeProps?.id ?? DefaultTreeProps.id,
      label: props.treeProps?.label ?? DefaultTreeProps.label,
      children: props.treeProps?.children ?? DefaultTreeProps.children,
      disabled: props.treeProps?.disabled ?? DefaultTreeProps.disabled,
      leaf: props.treeProps?.leaf ?? DefaultTreeProps.leaf,
      append: props.treeProps?.append ?? DefaultTreeProps.append,
      icon: props.treeProps?.icon ?? DefaultTreeProps.icon
    };
  });

  const isMultiple = computed(() => Boolean(props.multiple));
  // 未显式传入时默认打包已选中的禁用节点，保持与历史行为一致。
  const resolvedPackDisabledKey = computed(() => props.packDisabledKey ?? true);

  watch(
    () => [
      props.data,
      getTreeConfigSignature()
    ] as const,
    () => {
      initializeTree(toRaw(props.data ?? []));
    },
    {
      immediate: true
    }
  );

  watch(
    () => getExpansionConfigSignature(),
    () => {
      applyExpandedState();
    }
  );

  watch(
    () => [getCheckedValueSignature(), getCheckedBehaviorSignature()] as const,
    ([, behaviorSignature], [, previousBehaviorSignature]) => {
      const checkedKeys = getInitialCheckedKeys();
      if (behaviorSignature === previousBehaviorSignature && isConfiguredCheckedStateCurrent(checkedKeys)) {
        return;
      }
      applyConfiguredCheckedState(checkedKeys);
    }
  );

  watch(
    () => [props.filterValue, props.filterMethod] as const,
    () => {
      updateVisibility();
    }
  );

  function initializeTree(treeData: TreeDataItem[] = []) {
    const wasInitialized = initialized;
    const preserveRuntimeChecked = initialized && props.modelValue === undefined;
    const checkedKeys = props.modelValue !== undefined
      ? getInitialCheckedKeys()
      : preserveRuntimeChecked
        ? isMultiple.value
          ? [...getRawCheckedKeys(), ...pendingCheckedKeys]
          : [...pendingImperativeCheckedKeys, ...pendingCheckedKeys, ...getRawCheckedKeys()]
        : getInitialCheckedKeys();
    const pendingKeys = preserveRuntimeChecked ? [...pendingCheckedKeys] : checkedKeys;
    const imperativeKeys = [...pendingImperativeCheckedKeys];
    syncCachedExpandedKeys();
    childrenMap.value = new Map();
    nodeMap.value = new Map();
    warnedInvalidKeys = new Set();
    treeList.value = flattenTree(treeData);
    treeVersion.value += 1;
    initialized = true;
    applyCheckedState(checkedKeys);
    pendingCheckedKeys = new Set(pendingKeys.filter((key) => !nodeMap.value.has(key)));
    const resolvedImperativeKeys = imperativeKeys.filter((key) => nodeMap.value.has(key));
    pendingImperativeCheckedKeys = new Set(
      imperativeKeys.filter((key) => pendingCheckedKeys.has(key))
    );
    applyExpandedState();
    publishPendingSelectionChange(resolvedImperativeKeys);
    reconcileMissingControlledKeys(wasInitialized, checkedKeys);
    triggerRef(nodeMap);
    triggerRef(childrenMap);
  }

  function toggleExpand(node: TreeNode) {
    if (!isExpandable(node)) {
      return null;
    }

    const nextExpanded = !node.expanded;
    if (nextExpanded && props.accordion) {
      const siblings = node.parentId === undefined
        ? treeList.value.filter((item) => item.level === 0)
        : childrenMap.value.get(node.parentId) ?? [];
      for (const sibling of siblings) {
        if (sibling !== node && sibling.expanded) {
          sibling.expanded = false;
          syncExpandedCacheForNode(sibling);
        }
      }
    }

    node.expanded = nextExpanded;
    if (props.cacheExpandedKeys) {
      if (node.expanded) {
        cachedExpandedKeys.add(node.id);
      } else {
        cachedExpandedKeys.delete(node.id);
      }
    }
    updateVisibility();
    return {
      expanded: node.expanded,
      node
    };
  }

  function checkNode(node: TreeNode) {
    if (!canSelectNode(node)) {
      return null;
    }

    if (isMultiple.value) {
      const newStatus = node.checked === CHECK_STATUS_MAP.checked
        ? CHECK_STATUS_MAP.unchecked
        : CHECK_STATUS_MAP.checked;
      if (props.checkStrictly) {
        node.checked = newStatus;
      } else {
        updateNodeAndDescendantsStatus(node.id, newStatus);
        updateParentNodesStatus(node.id);
      }
    } else {
      // 后续用户操作取代先前尚未落地的单选请求，包括点击已选节点取消选择。
      pendingCheckedKeys.clear();
      pendingImperativeCheckedKeys.clear();
      const newStatus = node.checked === CHECK_STATUS_MAP.checked
        ? CHECK_STATUS_MAP.unchecked
        : CHECK_STATUS_MAP.checked;
      clearCheckedStatus();
      if (newStatus === CHECK_STATUS_MAP.checked) {
        node.checked = CHECK_STATUS_MAP.checked;
      }
    }

    return buildCheckChangePayload(node);
  }

  function flattenTree(
    list: TreeDataItem[] = [],
    level = 0,
    parentIds: TreeKey[] = [],
    parents: TreeDataItem[] = [],
    nodes: TreeNode[] = []
  ) {
    const {
      id: idKey,
      label: labelKey,
      children: childrenKey,
      disabled: disabledKey = "disabled",
      append: appendKey = "append",
      icon: iconKey = "icon"
    } = resolvedTreeProps.value;
    // 新节点在此处首次登记，写入原始 Map 以跳过响应式集合的拦截开销（万级节点时占重建耗时的大头）。
    // 读取仍经过响应式 Map 并拿到节点代理；结构更新完成后统一 triggerRef 通知索引依赖，
    // 让 getNode / getNodePath / hasChildren 等响应式查询也能感知新增和替换的节点。
    const rawNodeMap = toRaw(nodeMap.value);
    const rawChildrenMap = toRaw(childrenMap.value);
    // 所有层级共用同一个结果数组按前序追加：避免逐层复制子数组，
    // 也避免 push(...children) 在单层子节点过多时超出调用栈参数上限。
    for (const item of list) {
      const id = item[idKey] as TreeKey;
      const children = item[childrenKey];
      const label = String(item[labelKey] ?? "");
      warnAboutInvalidKey(id, label);
      // parentIds 是自根到父的完整链路，末位即直接父级；根节点为 undefined。
      const parentId = parentIds[parentIds.length - 1];

      const treeNode: TreeNode = {
        id,
        label,
        append: String(item[appendKey] ?? ""),
        icon: String(item[iconKey] ?? ""),
        path: [...parents.map((parent) => String(parent[labelKey] ?? "")), label],
        source: item,
        parentId,
        parentIds,
        parents,
        level,
        expanded: false,
        visible: level === 0,
        disabled: Boolean(item[disabledKey]),
        checked: CHECK_STATUS_MAP.unchecked,
        isLeaf: false,
        loaded: false,
        loading: false,
        loadError: null
      };
      treeNode.isLeaf = resolveIsLeaf(item, treeNode);
      treeNode.loaded = treeNode.isLeaf || !props.loadMode || (Array.isArray(children) && children.length > 0 && !props.alwaysFirstLoad);
      nodes.push(treeNode);

      if (id !== undefined && id !== null && rawNodeMap.has(id)) {
        warnOnce(
          `duplicate:${String(id)}`,
          `[uni-tree-view] 检测到重复节点 key：${String(id)}。请确保 tree-props.id 映射的值在整棵树中唯一。`
        );
      }
      rawNodeMap.set(id, treeNode);
      if (parentId !== undefined) {
        const siblings = rawChildrenMap.get(parentId);
        if (siblings) {
          toRaw(siblings).push(treeNode);
        } else {
          rawChildrenMap.set(parentId, [treeNode]);
        }
      }

      if (Array.isArray(children) && children.length > 0) {
        flattenTree(children, level + 1, [...parentIds, id], [...parents, item], nodes);
      }
    }

    return nodes;
  }

  function applyCheckedState(keys: TreeKey[]) {
    const clearedKeys = clearCheckedStatus();
    if (keys.length === 0) {
      updateParentNodesStatus(clearedKeys);
      return;
    }

    if (isMultiple.value) {
      if (props.checkStrictly) {
        for (const key of keys) {
          const node = nodeMap.value.get(key);
          if (node && canSelectDisabledNode(node)) {
            node.checked = CHECK_STATUS_MAP.checked;
          }
        }
        return;
      }

      updateNodeAndDescendantsStatus(keys, CHECK_STATUS_MAP.checked, Boolean(props.checkedDisabled));
      // 旧分支中已清空的子节点也会影响父级汇总，不能只更新新 keys 的祖先。
      updateParentNodesStatus([...clearedKeys, ...keys]);
      return;
    }

    const firstSelectableKey = keys.find((key) => {
      const node = nodeMap.value.get(key);
      return node && canSelectDisabledNode(node) && (!props.onlyRadioLeaf || node.isLeaf);
    });
    if (firstSelectableKey !== undefined) {
      const node = nodeMap.value.get(firstSelectableKey);
      if (node) {
        node.checked = CHECK_STATUS_MAP.checked;
      }
    }
  }

  function applyConfiguredCheckedState(keys: TreeKey[]) {
    applyCheckedState(keys);
    pendingCheckedKeys = new Set(keys.filter((key) => !nodeMap.value.has(key)));
    pendingImperativeCheckedKeys = new Set();
  }

  function applyPendingCheckedState() {
    const resolvedKeys = [...pendingCheckedKeys].filter((key) => nodeMap.value.has(key));
    if (resolvedKeys.length === 0) {
      return;
    }

    const resolvedImperativeKeys = resolvedKeys.filter((key) => pendingImperativeCheckedKeys.has(key));
    for (const key of resolvedKeys) {
      pendingCheckedKeys.delete(key);
      pendingImperativeCheckedKeys.delete(key);
    }

    if (isMultiple.value) {
      if (props.checkStrictly) {
        for (const key of resolvedKeys) {
          const node = nodeMap.value.get(key);
          if (node && canSelectDisabledNode(node)) {
            node.checked = CHECK_STATUS_MAP.checked;
          }
        }
      } else {
        updateNodeAndDescendantsStatus(resolvedKeys, CHECK_STATUS_MAP.checked, Boolean(props.checkedDisabled));
        updateParentNodesStatus(resolvedKeys);
      }
      publishPendingSelectionChange(resolvedImperativeKeys);
      return;
    }

    const node = resolvedKeys
      .map((key) => nodeMap.value.get(key))
      .find((item): item is TreeNode => item !== undefined && canSelectNode(item));
    if (node) {
      clearCheckedStatus();
      node.checked = CHECK_STATUS_MAP.checked;
    }
    publishPendingSelectionChange(resolvedImperativeKeys);
  }

  function applyExpandedState() {
    const defaultExpandedKeys = normalizeKeys(props.defaultExpandedKeys);
    const expandedKeySet = new Set<TreeKey>(defaultExpandedKeys);

    if (props.defaultExpandParent !== false) {
      for (const key of defaultExpandedKeys) {
        const node = nodeMap.value.get(key);
        if (!node) {
          continue;
        }

        for (const parentId of node.parentIds) {
          expandedKeySet.add(parentId);
        }
      }
    }

    const expandAll = Boolean(props.defaultExpandAll);
    const useCachedKeys = Boolean(props.cacheExpandedKeys);
    const nodes = treeList.value;
    const rawNodes = toRaw(nodes);
    for (let index = 0; index < rawNodes.length; index += 1) {
      // 读原始对象、仅在值变化时经代理写入，避免对整棵树逐节点触发响应式 set。
      const rawNode = toRaw(rawNodes[index]);
      const expanded = expandAll
        || expandedKeySet.has(rawNode.id)
        || (useCachedKeys && cachedExpandedKeys.has(rawNode.id));
      if (rawNode.expanded !== expanded) {
        nodes[index].expanded = expanded;
      }
    }

    applyExpandCheckedState();

    updateVisibility();
  }

  function applyExpandCheckedState() {
    if (!props.expandChecked) {
      return;
    }

    for (const node of getCheckedNodes()) {
      for (const parentId of node.parentIds) {
        const parent = nodeMap.value.get(parentId);
        if (parent) {
          parent.expanded = true;
        }
      }
    }
  }

  function updateNodeAndDescendantsStatus(
    targetIds: TreeKey | TreeKey[],
    newStatus: Exclude<CheckStatus, "indeterminate">,
    includeDisabled = false
  ) {
    const pendingIds = [...(Array.isArray(targetIds) ? targetIds : [targetIds])];

    while (pendingIds.length > 0) {
      const targetId = pendingIds.pop();
      if (targetId === undefined) {
        continue;
      }

      const node = nodeMap.value.get(targetId);
      if (!node || (node.disabled && !includeDisabled && !props.checkedDisabled)) {
        continue;
      }

      node.checked = newStatus;
      const children = childrenMap.value.get(targetId);
      if (children && children.length > 0) {
        for (const child of children) {
          pendingIds.push(child.id);
        }
      }
    }
  }

  function hasChildren(nodeId: TreeKey) {
    const children = childrenMap.value.get(nodeId);
    return Array.isArray(children) && children.length > 0;
  }

  function isExpandable(node: TreeNode) {
    return !node.isLeaf && (hasChildren(node.id) || Boolean(props.loadMode));
  }

  function updateParentNodesStatus(targetIds?: TreeKey | TreeKey[]) {
    if (props.checkStrictly || !isMultiple.value) {
      return;
    }

    if (targetIds === undefined) {
      for (let index = treeList.value.length - 1; index >= 0; index -= 1) {
        updateNodeFromChildren(treeList.value[index]);
      }
      return;
    }

    const affectedNodes = new Map<TreeKey, TreeNode>();
    const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
    for (const id of ids) {
      const node = nodeMap.value.get(id);
      if (!node) {
        continue;
      }
      if (hasChildren(node.id)) {
        affectedNodes.set(node.id, node);
      }
      for (const parentId of node.parentIds) {
        const parent = nodeMap.value.get(parentId);
        if (parent) {
          affectedNodes.set(parent.id, parent);
        }
      }
    }

    [...affectedNodes.values()]
      .sort((a, b) => b.level - a.level)
      .forEach(updateNodeFromChildren);
  }

  function updateNodeFromChildren(node: TreeNode) {
    const children = childrenMap.value.get(node.id);
    if (!children?.length) {
      return;
    }

    const allChecked = children.every((child) => child.checked === CHECK_STATUS_MAP.checked);
    const allUnchecked = children.every((child) => child.checked === CHECK_STATUS_MAP.unchecked);

    if (allChecked) {
      node.checked = CHECK_STATUS_MAP.checked;
    } else if (allUnchecked) {
      node.checked = CHECK_STATUS_MAP.unchecked;
    } else {
      node.checked = CHECK_STATUS_MAP.indeterminate;
    }
  }

  function updateVisibility() {
    const rawFilterValue = String(props.filterValue ?? "").trim();
    const normalizedFilterValue = rawFilterValue.toLowerCase();
    const visibleNodes: TreeNode[] = [];

    if (rawFilterValue) {
      const visibleKeySet = new Set<TreeKey>();
      const matchedNodes: TreeNode[] = [];
      const nodes = treeList.value;
      const rawNodes = toRaw(nodes);
      for (let index = 0; index < rawNodes.length; index += 1) {
        // 只读字段走原始对象，避免逐节点代理与依赖收集；自定义匹配函数和结果仍使用代理节点。
        const node = nodes[index];
        const rawNode = toRaw(rawNodes[index]);
        const matched = props.filterMethod
          ? props.filterMethod(rawFilterValue, node)
          : rawNode.label.toLowerCase().includes(normalizedFilterValue);
        if (!matched) {
          continue;
        }

        matchedNodes.push(node);
        // 前序遍历中，已可见的当前节点只能被先前命中的祖先整支覆盖；仍须登记自身匹配。
        if (visibleKeySet.has(rawNode.id)) {
          continue;
        }
        visibleKeySet.add(rawNode.id);
        for (const parentId of rawNode.parentIds) {
          visibleKeySet.add(parentId);
        }
        addDescendantVisibleKeys(rawNode.id, visibleKeySet);
      }

      for (let index = 0; index < rawNodes.length; index += 1) {
        const rawNode = toRaw(rawNodes[index]);
        const visible = visibleKeySet.has(rawNode.id);
        if (rawNode.visible !== visible) {
          nodes[index].visible = visible;
        }
        if (visible) {
          visibleNodes.push(nodes[index]);
        }
      }
      visibleTreeList.value = visibleNodes;
      matchedTreeList.value = matchedNodes;
      return buildFilterPayload(visibleNodes, matchedNodes);
    }

    matchedTreeList.value = [];

    // treeList 是前序展开的，节点的父级必然是最近一个 level - 1 的节点，因此按层级栈记住
    // 「父级是否展开且可见」即可，无需为每个节点回查 nodeMap（那是这里最大的一笔开销）。
    // 栈内存布尔值而非节点，父级不可见时整棵子树都会被判为不可见，与原先的逐级回查等价。
    const parentVisibleStack: boolean[] = [];
    const nodes = treeList.value;
    const rawNodes = toRaw(nodes);
    for (let index = 0; index < rawNodes.length; index += 1) {
      // 重建或懒加载后数组可能混有代理节点；只读时解包，写入与对外返回仍使用原代理。
      const node = toRaw(rawNodes[index]);
      const level = node.level;
      const visible = level === 0 || parentVisibleStack[level - 1] === true;
      if (node.visible !== visible) {
        nodes[index].visible = visible;
      }
      if (visible) {
        visibleNodes.push(nodes[index]);
      }
      parentVisibleStack[level] = visible && node.expanded === true;
    }

    visibleTreeList.value = visibleNodes;
    return buildFilterPayload(visibleNodes);
  }

  function buildFilterPayload(
    nodes = visibleTreeList.value,
    matchedNodes = matchedTreeList.value
  ) {
    return {
      value: String(props.filterValue ?? ""),
      keys: nodes.map((node) => node.id),
      nodes,
      matchedKeys: matchedNodes.map((node) => node.id),
      matchedNodes
    };
  }

  function syncCachedExpandedKeys() {
    if (!props.cacheExpandedKeys) {
      return;
    }

    for (const node of treeList.value) {
      if (node.expanded) {
        cachedExpandedKeys.add(node.id);
      } else {
        cachedExpandedKeys.delete(node.id);
      }
    }
  }

  function canSelectNode(node: TreeNode) {
    if (!canSelectDisabledNode(node)) {
      return false;
    }

    if (!isMultiple.value && props.onlyRadioLeaf && !node.isLeaf) {
      return false;
    }

    return true;
  }

  function canSelectDisabledNode(node: TreeNode) {
    return !node.disabled || Boolean(props.checkedDisabled);
  }

  function clearCheckedStatus() {
    const clearedKeys: TreeKey[] = [];
    const checkedDisabled = Boolean(props.checkedDisabled);
    const nodes = treeList.value;
    const rawNodes = toRaw(nodes);
    for (let index = 0; index < rawNodes.length; index += 1) {
      const rawNode = toRaw(rawNodes[index]);
      if ((rawNode.disabled && !checkedDisabled) || rawNode.checked === CHECK_STATUS_MAP.unchecked) {
        continue;
      }
      nodes[index].checked = CHECK_STATUS_MAP.unchecked;
      clearedKeys.push(rawNode.id);
    }
    return clearedKeys;
  }

  function getRawCheckedKeys() {
    const keys: TreeKey[] = [];
    for (const rawNode of toRaw(treeList.value)) {
      const node = toRaw(rawNode);
      if (node.checked === CHECK_STATUS_MAP.checked) {
        keys.push(node.id);
      }
    }
    return keys;
  }

  function normalizeKeys(value: TreeKey | TreeKey[] | null | undefined): TreeKey[] {
    if (value === null || value === undefined) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  // 以下四个签名把配置项序列化成字符串，供 watch 做浅层比较。
  // 大树上深度侦听 data 的代价过高，因此只在「引用变化」或「配置签名变化」时才重建/重放状态。

  function getTreeConfigSignature() {
    return JSON.stringify({
      treeProps: resolvedTreeProps.value,
      loadMode: props.loadMode,
      alwaysFirstLoad: props.alwaysFirstLoad
    });
  }

  function getExpansionConfigSignature() {
    return JSON.stringify({
      defaultExpandAll: props.defaultExpandAll,
      defaultExpandedKeys: normalizeKeys(props.defaultExpandedKeys),
      defaultExpandParent: props.defaultExpandParent,
      expandChecked: props.expandChecked,
      cacheExpandedKeys: props.cacheExpandedKeys
    });
  }

  // 选中值可能是很长的 key 数组，而上面的 watch 回调只比较 behaviorSignature，本签名仅用于
  // 登记依赖。join 会逐项读取，对这种扁平的原始值数组与 JSON.stringify 登记的依赖一致，但省掉
  // 了引号转义和对象包装。
  function getCheckedValueSignature() {
    const controlled = props.modelValue !== undefined;
    const source = controlled ? props.modelValue : props.defaultCheckedKeys;
    const prefix = controlled ? "c" : "d";
    if (!Array.isArray(source)) {
      return `${prefix}:${String(source)}`;
    }

    return `${prefix}${source.length}:${source.join(",")}`;
  }

  function getCheckedBehaviorSignature() {
    return JSON.stringify({
      multiple: props.multiple,
      checkStrictly: props.checkStrictly,
      onlyRadioLeaf: props.onlyRadioLeaf,
      checkedDisabled: props.checkedDisabled,
      packDisabledKey: resolvedPackDisabledKey.value
    });
  }

  /**
   * 判断当前选中态是否已等价于配置值，用于跳过受控 v-model 回流引起的重复重放。
   * 比较时并入 pendingCheckedKeys，避免懒加载尚未落地的 key 被误判为"缺失"而重放。
   */
  function isConfiguredCheckedStateCurrent(keys: TreeKey[]) {
    const expectedKeySet = new Set(keys);
    const currentKeySet = new Set([...getCheckedKeys(), ...pendingCheckedKeys]);
    if (expectedKeySet.size !== currentKeySet.size) {
      return false;
    }
    return [...expectedKeySet].every((key) => currentKeySet.has(key));
  }

  function getInitialCheckedKeys() {
    if (props.modelValue !== undefined) {
      return normalizeKeys(props.modelValue);
    }

    return normalizeKeys(props.defaultCheckedKeys);
  }

  function getSelectionIconClass(node: TreeNode) {
    if (isMultiple.value) {
      if (node.checked === CHECK_STATUS_MAP.checked) {
        return "utv-tree-checkbox-checked";
      }
      if (node.checked === CHECK_STATUS_MAP.indeterminate) {
        return "utv-tree-checkbox-indeterminate";
      }
      return "utv-tree-checkbox-outline";
    }

    if (node.checked === CHECK_STATUS_MAP.checked) {
      return "utv-tree-radio-checked";
    }

    return "utv-tree-radio-outline";
  }

  function getCheckedKeys() {
    return getCheckedNodes().map((node) => node.id);
  }

  function getHalfCheckedKeys() {
    return getHalfCheckedNodes().map((node) => node.id);
  }

  function getUncheckedKeys() {
    return getUncheckedNodes().map((node) => node.id);
  }

  // 「选中且应当对外暴露」的唯一判定处，getCheckedNodes 与 buildCheckChangePayload 共用，
  // 避免 packDisabledKey 规则日后在两处各改一份。
  function isPackableCheckedNode(node: TreeNode, includeDisabled: boolean) {
    return node.checked === CHECK_STATUS_MAP.checked && (includeDisabled || !node.disabled);
  }

  function getCheckedNodes() {
    const includeDisabled = resolvedPackDisabledKey.value;
    return treeList.value.filter((node) => isPackableCheckedNode(node, includeDisabled));
  }

  function getHalfCheckedNodes() {
    return treeList.value.filter((node) => node.checked === CHECK_STATUS_MAP.indeterminate);
  }

  function getUncheckedNodes() {
    return treeList.value.filter((node) => node.checked === CHECK_STATUS_MAP.unchecked);
  }

  function getExpandedKeys() {
    return getExpandedNodes().map((node) => node.id);
  }

  function getUnexpandedKeys() {
    return getUnexpandedNodes().map((node) => node.id);
  }

  function getVisibleKeys() {
    return getVisibleNodes().map((node) => node.id);
  }

  function getMatchedKeys() {
    return getMatchedNodes().map((node) => node.id);
  }

  function getExpandedNodes() {
    return treeList.value.filter((node) => !node.isLeaf && node.expanded);
  }

  function getUnexpandedNodes() {
    return treeList.value.filter((node) => !node.isLeaf && !node.expanded);
  }

  function getVisibleNodes() {
    return visibleTreeList.value;
  }

  function getMatchedNodes() {
    return matchedTreeList.value;
  }

  function getNode(key: TreeKey) {
    return nodeMap.value.get(key);
  }

  function getNodePath(keyOrNode: TreeKey | TreeNode) {
    const targetNode = typeof keyOrNode === "object" ? keyOrNode : nodeMap.value.get(keyOrNode);
    if (!targetNode) {
      return [];
    }

    return [...targetNode.parentIds, targetNode.id]
      .map((key) => nodeMap.value.get(key))
      .filter((node): node is TreeNode => Boolean(node));
  }

  // 每次勾选都会构造一次载荷，分别调用三个 getter 会把 treeList 扫三遍；这里合成一次遍历，
  // 推入顺序与逐个 filter 完全一致，因此对外的数组顺序不变。
  function buildCheckChangePayload(node: TreeNode): TreeCheckChangePayload {
    const nodes: TreeNode[] = [];
    const keys: TreeKey[] = [];
    const halfCheckedNodes: TreeNode[] = [];
    const halfCheckedKeys: TreeKey[] = [];
    const includeDisabled = resolvedPackDisabledKey.value;
    const candidates = treeList.value;
    const rawCandidates = toRaw(candidates);

    // 载荷只在事件回调里构造，不处于侦听上下文，判定读原始对象即可；数组里仍放代理节点。
    for (let index = 0; index < rawCandidates.length; index += 1) {
      const candidate = toRaw(rawCandidates[index]);
      if (isPackableCheckedNode(candidate, includeDisabled)) {
        nodes.push(candidates[index]);
        keys.push(candidate.id);
        continue;
      }

      if (candidate.checked === CHECK_STATUS_MAP.indeterminate) {
        halfCheckedNodes.push(candidates[index]);
        halfCheckedKeys.push(candidate.id);
      }
    }

    return {
      value: isMultiple.value ? keys : (keys[0] ?? null),
      keys,
      nodes,
      halfCheckedKeys,
      halfCheckedNodes,
      node
    };
  }

  function publishPendingSelectionChange(keys: TreeKey[]) {
    const changedNode = keys
      .map((key) => nodeMap.value.get(key))
      .find((node): node is TreeNode => node !== undefined && canSelectNode(node));
    if (changedNode) {
      pendingCheckChangePayload.value = buildCheckChangePayload(changedNode);
    }
  }

  function reconcileMissingControlledKeys(wasInitialized: boolean, configuredKeys: TreeKey[]) {
    if (!wasInitialized || props.modelValue === undefined || props.loadMode) {
      return;
    }
    if (!configuredKeys.some((key) => !nodeMap.value.has(key))) {
      return;
    }

    const keys = getCheckedKeys();
    reconciledModelValue.value = {
      value: isMultiple.value ? keys : (keys[0] ?? null)
    };
  }

  function warnAboutInvalidKey(id: TreeKey, label: string) {
    if (id !== undefined && id !== null) {
      return;
    }
    warnOnce(
      "missing",
      `[uni-tree-view] 检测到缺失节点 key。请检查 tree-props.id 映射；问题节点 label：${label || "(空)"}`
    );
  }

  function warnOnce(key: string, message: string) {
    if (!(import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV || warnedInvalidKeys.has(key)) {
      return;
    }
    warnedInvalidKeys.add(key);
    console.warn(message);
  }

  function setCheckedKeys(keys: TreeKey | TreeKey[], checked = true) {
    const normalizedKeys = normalizeKeys(keys);

    if (!checked) {
      for (const key of normalizedKeys) {
        pendingCheckedKeys.delete(key);
        pendingImperativeCheckedKeys.delete(key);
      }
      const changedNode = normalizedKeys
        .map((key) => nodeMap.value.get(key))
        .find((node): node is TreeNode => node !== undefined && canSelectNode(node));
      if (!changedNode) {
        return null;
      }

      if (isMultiple.value) {
        if (props.checkStrictly) {
          for (const key of normalizedKeys) {
            const node = nodeMap.value.get(key);
            if (node && canSelectDisabledNode(node)) {
              node.checked = CHECK_STATUS_MAP.unchecked;
            }
          }
        } else {
          updateNodeAndDescendantsStatus(normalizedKeys, CHECK_STATUS_MAP.unchecked, Boolean(props.checkedDisabled));
          updateParentNodesStatus(normalizedKeys);
        }
      } else {
        for (const key of normalizedKeys) {
          const node = nodeMap.value.get(key);
          if (node && canSelectNode(node)) {
            node.checked = CHECK_STATUS_MAP.unchecked;
          }
        }
      }
      return buildCheckChangePayload(changedNode);
    }

    if (!isMultiple.value) {
      const targetKey = normalizedKeys.find((key) => {
        const node = nodeMap.value.get(key);
        return node === undefined || canSelectNode(node);
      });
      if (targetKey === undefined) {
        return null;
      }

      const targetNode = nodeMap.value.get(targetKey);
      pendingCheckedKeys = new Set();
      pendingImperativeCheckedKeys = new Set();
      if (!targetNode) {
        pendingCheckedKeys.add(targetKey);
        pendingImperativeCheckedKeys.add(targetKey);
        return null;
      }

      clearCheckedStatus();
      targetNode.checked = CHECK_STATUS_MAP.checked;
      return buildCheckChangePayload(targetNode);
    }

    const unresolvedKeys = normalizedKeys.filter((key) => !nodeMap.value.has(key));
    for (const key of unresolvedKeys) {
      pendingCheckedKeys.add(key);
      pendingImperativeCheckedKeys.add(key);
    }
    const changedNode = normalizedKeys
      .map((key) => nodeMap.value.get(key))
      .find((node): node is TreeNode => node !== undefined && canSelectNode(node));
    if (!changedNode) {
      return null;
    }

    if (props.checkStrictly) {
      for (const key of normalizedKeys) {
        const node = nodeMap.value.get(key);
        if (node && canSelectDisabledNode(node)) {
          node.checked = CHECK_STATUS_MAP.checked;
        }
      }
    } else {
      updateNodeAndDescendantsStatus(normalizedKeys, CHECK_STATUS_MAP.checked, Boolean(props.checkedDisabled));
      updateParentNodesStatus(normalizedKeys);
    }

    return buildCheckChangePayload(changedNode);
  }

  function setExpandedKeys(keys: TreeKey[] | "all", expanded = true) {
    if (keys === "all") {
      const nodes = treeList.value;
      const rawNodes = toRaw(nodes);
      for (let index = 0; index < rawNodes.length; index += 1) {
        const rawNode = toRaw(rawNodes[index]);
        if (!rawNode.isLeaf) {
          if (rawNode.expanded !== expanded) {
            nodes[index].expanded = expanded;
          }
          syncExpandedCacheForNode(rawNode);
        }
      }
      updateVisibility();
      return;
    }

    for (const key of keys) {
      const node = nodeMap.value.get(key);
      if (node && !node.isLeaf) {
        node.expanded = expanded;
        syncExpandedCacheForNode(node);
      }
    }
    updateVisibility();
  }

  function syncExpandedCacheForNode(node: TreeNode) {
    if (!props.cacheExpandedKeys) {
      return;
    }

    if (node.expanded) {
      cachedExpandedKeys.add(node.id);
    } else {
      cachedExpandedKeys.delete(node.id);
    }
  }

  function expandAll() {
    setExpandedKeys("all", true);
  }

  function collapseAll() {
    setExpandedKeys("all", false);
  }

  function resolveIsLeaf(item: TreeDataItem, node: TreeNode) {
    if (props.isLeafFn) {
      return props.isLeafFn(item, node);
    }

    const { children: childrenKey, leaf: leafKey = "leaf" } = resolvedTreeProps.value;
    const children = item[childrenKey];
    if (props.loadMode && item[leafKey] !== undefined) {
      return Boolean(item[leafKey]);
    }

    if (props.loadMode) {
      return false;
    }

    return !(Array.isArray(children) && children.length > 0);
  }

  function addDescendantVisibleKeys(nodeId: TreeKey, visibleKeySet: Set<TreeKey>) {
    const pendingNodes = [...(childrenMap.value.get(nodeId) ?? [])];
    while (pendingNodes.length > 0) {
      const child = pendingNodes.pop();
      if (!child) {
        continue;
      }
      visibleKeySet.add(child.id);
      // 逐个入栈：单个父节点下子节点极多时，展开参数会超出调用栈上限。
      for (const grandchild of childrenMap.value.get(child.id) ?? []) {
        pendingNodes.push(grandchild);
      }
    }
  }

  function removeDescendants(nodeId: TreeKey) {
    const children = childrenMap.value.get(nodeId) ?? [];
    const descendantIds = new Set<TreeKey>();
    for (const child of children) {
      collectDescendantIds(child.id, descendantIds);
    }

    if (descendantIds.size === 0) {
      return;
    }

    treeList.value = treeList.value.filter((node) => !descendantIds.has(node.id));
    for (const id of descendantIds) {
      nodeMap.value.delete(id);
      childrenMap.value.delete(id);
    }
    childrenMap.value.delete(nodeId);
  }

  function collectDescendantIds(nodeId: TreeKey, ids: Set<TreeKey>) {
    ids.add(nodeId);
    const children = childrenMap.value.get(nodeId);
    if (!children?.length) {
      return;
    }

    for (const child of children) {
      collectDescendantIds(child.id, ids);
    }
  }

  function replaceNodeChildren(node: TreeNode, children: TreeDataItem[]) {
    const shouldInheritChecked = isMultiple.value
      && !props.checkStrictly
      && node.checked === CHECK_STATUS_MAP.checked;
    // 只有替换已有子树时才需保留旧选择；未知节点的选择继续由 pending 队列处理。
    const checkedKeys = hasChildren(node.id)
      ? props.modelValue !== undefined ? getInitialCheckedKeys() : getRawCheckedKeys()
      : null;
    removeDescendants(node.id);

    const childNodes = flattenTree(children, node.level + 1, [...node.parentIds, node.id], [...node.parents, node.source]);
    treeVersion.value += 1;
    // 整体替换数组而非 splice(..., ...childNodes)：一次加载大量子节点时不会受函数参数个数限制，
    // 也省去响应式数组逐个下标触发的开销。
    const currentList = toRaw(treeList.value);
    const nodeIndex = currentList.findIndex((item) => toRaw(item).id === node.id);
    treeList.value = nodeIndex === -1
      ? currentList.concat(childNodes)
      : [...currentList.slice(0, nodeIndex + 1), ...childNodes, ...currentList.slice(nodeIndex + 1)];

    node.isLeaf = children.length === 0 && Boolean(props.loadMode);
    node.loaded = true;
    if (checkedKeys) {
      applyCheckedState(checkedKeys);
    } else if (shouldInheritChecked) {
      updateNodeAndDescendantsStatus(childNodes.map((child) => child.id), CHECK_STATUS_MAP.checked);
    }
    applyPendingCheckedState();
    updateParentNodesStatus(node.id);
    updateVisibility();
    triggerRef(nodeMap);
    triggerRef(childrenMap);
  }

  function loadNode(node: TreeNode): Promise<TreeDataItem[]> {
    const pending = loadingNodes.get(node);
    if (pending) {
      return pending;
    }
    const loadApi = props.loadApi;
    if (!props.loadMode || !loadApi || node.isLeaf || node.loading || node.loaded || nodeMap.value.get(node.id) !== node) {
      return Promise.resolve([]);
    }

    // 先登记 Promise，再调用外部 load-api，确保同步返回、同步抛错和重入调用都共享本次请求。
    const request = Promise.resolve().then(async () => {
      try {
        if (nodeMap.value.get(node.id) !== node) {
          return [];
        }
        const children = await loadApi(node);
        const normalizedChildren = Array.isArray(children) ? children : [];
        if (nodeMap.value.get(node.id) !== node) {
          return normalizedChildren;
        }
        replaceNodeChildren(node, normalizedChildren);
        return normalizedChildren;
      } catch (error) {
        if (nodeMap.value.get(node.id) !== node) {
          return [];
        }
        node.loadError = error;
        throw error;
      } finally {
        loadingNodes.delete(node);
        node.loading = false;
      }
    });
    loadingNodes.set(node, request);
    node.loading = true;
    node.loadError = null;
    return request;
  }

  return {
    treeList,
    childrenMap,
    nodeMap,
    resolvedTreeProps,
    isMultiple,
    visibleTreeList,
    matchedTreeList,
    treeVersion,
    reconciledModelValue,
    pendingCheckChangePayload,
    initializeTree,
    toggleExpand,
    checkNode,
    applyCheckedState,
    applyExpandedState,
    hasChildren,
    isExpandable,
    getSelectionIconClass,
    setCheckedKeys,
    getCheckedKeys,
    getHalfCheckedKeys,
    getUncheckedKeys,
    getCheckedNodes,
    getHalfCheckedNodes,
    getUncheckedNodes,
    setExpandedKeys,
    getExpandedKeys,
    getUnexpandedKeys,
    getVisibleKeys,
    getMatchedKeys,
    getExpandedNodes,
    getUnexpandedNodes,
    getVisibleNodes,
    getMatchedNodes,
    getNode,
    getNodePath,
    expandAll,
    collapseAll,
    loadNode
  };
}