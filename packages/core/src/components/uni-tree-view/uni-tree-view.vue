<template>
  <view
    class="uni-tree-view-container"
    :style="{ '--theme-color': props.themeColor }">
    <scroll-view
      :id="scrollViewId"
      class="scroll-view-container"
      :scroll-y="true"
      :scroll-top="virtualEnabled ? virtualScrollCommandTop : undefined"
      :scroll-into-view="scrollIntoView"
      :style="scrollViewStyle"
      @scroll="handleVirtualScroll">
      <view v-if="visibleTreeList.length === 0" class="utv-tree-empty">
        <template v-if="hasFilterValue">
          <slot name="empty-filter" :filter-value="props.filterValue">
            <slot name="empty" :filter-value="props.filterValue">
              {{ props.emptyText }}
            </slot>
          </slot>
        </template>
        <slot v-else name="empty" :filter-value="props.filterValue">
          {{ props.emptyText }}
        </slot>
      </view>
      <view
        v-if="virtualEnabled && virtualTopPadding > 0"
        class="utv-tree-virtual-spacer"
        :style="{ height: `${virtualTopPadding}px` }"></view>
      <view
        v-for="item in renderedTreeList"
        :id="item.domId"
        :key="item.node.id"
        :style="{
          paddingLeft: `${item.node.level * props.indent}px`,
          height: virtualEnabled ? `${props.virtualItemHeight}px` : undefined,
          minHeight: virtualEnabled ? `${props.virtualItemHeight}px` : undefined
        }"
        class="utv-tree-item"
        :class="[
          props.nodeClass,
          {
            'is-leaf': item.node.isLeaf,
            'is-expanded': item.node.expanded,
            'is-disabled': item.node.disabled,
            'is-checked': props.selectable && item.node.checked === 'checked',
            'is-virtual': virtualEnabled
          }
        ]"
        :hover-class="item.node.disabled ? 'none' : 'utv-tree-item--hover'"
        :hover-stay-time="80"
        @click="handleNodeClick(item.node)">
        <view class="utv-tree-item__state-layer"></view>

        <view
          v-if="isExpandable(item.node)"
          class="utv-tree-item__arrow-icon is-right"
          :class="{
            'is-expand': item.node.expanded,
            'is-loading': item.node.loading,
            'is-load-error': Boolean(item.node.loadError)
          }"
          @click.stop="handleToggleExpand(item.node)"></view>
        <view v-else class="utv-tree-item__arrow-placeholder"></view>

        <view
          v-if="showSelectionControl && props.selectionPlacement === 'left'"
          class="utv-tree-item__checkbox"
          :class="{ 'is-disabled': item.node.disabled }"
          @click.stop="handleCheckChange(item.node)">
          <view
            class="utv-tree-item__checkbox-icon"
            :class="getSelectionIconClass(item.node)"></view>
        </view>

        <view class="utv-tree-node-content">
          <template v-if="slots.default">
            <slot
              name="default"
              :node="item.node"
              :data="item.node.source"
              :path="item.path"></slot>
          </template>
          <template v-else>
            <view v-if="item.node.icon || slots.icon" class="utv-tree-node-icon">
              <template v-if="slots.icon">
                <slot
                  name="icon"
                  :node="item.node"
                  :data="item.node.source"
                  :path="item.path"></slot>
              </template>
              <template v-else>{{ item.node.icon }}</template>
            </view>
            <view class="utv-tree-node-main">
              <view class="utv-tree-node-label">
                <template v-if="slots.label">
                  <slot
                    name="label"
                    :node="item.node"
                    :data="item.node.source"
                    :path="item.path"></slot>
                </template>
                <template v-else>
                  <text
                    v-for="(segment, segmentIndex) in getLabelSegments(item.node.label)"
                    :key="segmentIndex"
                    :class="{ 'utv-tree-node-label__match': segment.matched }">
                    {{ segment.text }}
                  </text>
                </template>
              </view>
              <view v-if="props.showPath && item.node.path.length > 1" class="utv-tree-node-path">
                {{ item.node.path.join(props.pathSeparator) }}
              </view>
            </view>
            <view v-if="item.node.append || slots.append" class="utv-tree-node-append">
              <template v-if="slots.append">
                <slot
                  name="append"
                  :node="item.node"
                  :data="item.node.source"
                  :path="item.path"></slot>
              </template>
              <template v-else>{{ item.node.append }}</template>
            </view>
          </template>
        </view>

        <view
          v-if="showSelectionControl && props.selectionPlacement === 'right'"
          class="utv-tree-item__checkbox"
          :class="{ 'is-disabled': item.node.disabled }"
          @click.stop="handleCheckChange(item.node)">
          <view
            class="utv-tree-item__checkbox-icon"
            :class="getSelectionIconClass(item.node)"></view>
        </view>
      </view>
      <view
        v-if="virtualEnabled && virtualBottomPadding > 0"
        class="utv-tree-virtual-spacer"
        :style="{ height: `${virtualBottomPadding}px` }"></view>
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, shallowRef, watch } from "vue";
import type {
  TreeCheckChangePayload,
  TreeKey,
  TreeNode,
  TreeScrollToOptions,
  UniTreeViewEmits,
  UniTreeViewExposed,
  UniTreeViewProps,
  UniTreeViewSlots
} from "./types";
import { useTreeViewState } from "./useTreeViewState";
import { useVirtualTreeList } from "./useVirtualTreeList";
import type { UniTreeVirtualScrollEvent } from "./useVirtualTreeList";

defineOptions({
  name: "UniTreeView",
  options: {
    // #ifdef MP-WEIXIN || MP-ALIPAY
    virtualHost: true
    // #endif
  }
});

const props = withDefaults(defineProps<UniTreeViewProps>(), {
  modelValue: undefined,
  data: () => [],
  treeProps: undefined,
  filterValue: "",
  filterMethod: undefined,
  highlightFilter: true,
  themeColor: "#007aff",
  selectable: false,
  showRadioIcon: true,
  multiple: false,
  checkOnClickNode: false,
  checkOnClickLeaf: false,
  expandOnClickNode: false,
  accordion: false,
  checkStrictly: false,
  onlyRadioLeaf: false,
  defaultExpandAll: false,
  defaultExpandedKeys: () => [],
  defaultExpandParent: true,
  expandChecked: false,
  cacheExpandedKeys: false,
  defaultCheckedKeys: () => [],
  loadMode: false,
  loadApi: undefined,
  isLeafFn: undefined,
  alwaysFirstLoad: false,
  checkedDisabled: false,
  packDisabledKey: undefined,
  nodeClass: "",
  indent: 20,
  selectionPlacement: "left",
  emptyText: "暂无数据",
  showPath: false,
  pathSeparator: " / ",
  virtual: false,
  virtualItemHeight: 36,
  virtualHeight: 400,
  virtualOverscan: 8
});

const emit = defineEmits<UniTreeViewEmits>();
const slots = defineSlots<UniTreeViewSlots>();
const scrollIntoView = shallowRef("");
const virtualScrollCommandTop = shallowRef<number>();
const nodeDomIds = new Map<TreeKey, string>();
let nextNodeDomId = 0;

const {
  isMultiple,
  treeVersion,
  reconciledModelValue,
  pendingCheckChangePayload,
  visibleTreeList,
  toggleExpand,
  checkNode,
  isExpandable,
  getSelectionIconClass,
  loadNode: loadStateNode,
  setCheckedKeys: setStateCheckedKeys,
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
  collapseAll
} = useTreeViewState(props);

const showSelectionControl = computed(() => {
  return Boolean(props.selectable && (isMultiple.value || props.showRadioIcon));
});

const hasFilterValue = computed(() => String(props.filterValue ?? "").trim().length > 0);

const {
  virtualEnabled,
  renderedItems: virtualRenderedTreeList,
  scrollTop: virtualScrollTop,
  maxScrollTop: virtualMaxScrollTop,
  topPadding: virtualTopPadding,
  bottomPadding: virtualBottomPadding,
  scrollViewStyle,
  handleScroll: updateVirtualWindow,
  scrollToIndex,
  clampScrollTopToRange,
  syncScrollTop
} = useVirtualTreeList({
  items: visibleTreeList,
  virtual: () => props.virtual,
  itemHeight: () => props.virtualItemHeight,
  height: () => props.virtualHeight,
  overscan: () => props.virtualOverscan
});

// 滚动事件短暂停止后读取真实偏移，补齐节流上报可能遗漏的最终位置。
let scrollSettleTimer: ReturnType<typeof setTimeout> | undefined;
let scrollMeasurementVersion = 0;
let scrollCommandVersion = 0;
let isUnmounted = false;
const SCROLL_SETTLE_DELAY = 120;

// 选择器查询必须带上组件实例：小程序的自定义组件内部节点对页面级查询不可见。实例只能在
// setup 期间取到，定时器回调里 getCurrentInstance() 已经是 null，所以在这里先存下来。
const instance = getCurrentInstance();
// 支付宝的 in(component) 可能不生效，查询还需使用实例唯一的节点 id。
const scrollViewId = `utv-scroll-${instance?.uid ?? 0}`;

function reconcileScrollTop() {
  if (isUnmounted || !virtualEnabled.value || !instance || typeof uni === "undefined") {
    return;
  }

  const measurementVersion = scrollMeasurementVersion;
  let queryScope: unknown = instance.proxy;
  // #ifdef MP-ALIPAY
  // 支付宝保留原生 in 时不解包 Vue 实例；微信已有含 Skyline 的适配，H5 也继续传 Vue 实例。
  queryScope = (instance.proxy as { $scope?: unknown } | null)?.$scope ?? queryScope;
  // #endif
  uni.createSelectorQuery()
    .in(queryScope)
    .select(`#${scrollViewId}`)
    .fields({ scrollOffset: true }, () => {})
    .exec(([node]) => {
      // 新滚动、定位或窗口变化后，旧查询不能再覆盖当前状态。
      if (isUnmounted || measurementVersion !== scrollMeasurementVersion) {
        return;
      }

      const measuredScrollTop = (node as UniApp.NodeInfo | undefined)?.scrollTop;
      if (typeof measuredScrollTop !== "number") {
        return;
      }

      // 位置仍有变化时继续测量，直到读数稳定；不向原生视图下发滚动指令。
      if (syncScrollTop(measuredScrollTop)) {
        scheduleScrollSettleCheck();
      }
    });
}

function cancelScrollSettleCheck() {
  clearTimeout(scrollSettleTimer);
  scrollSettleTimer = undefined;
  scrollMeasurementVersion += 1;
}

function scheduleScrollSettleCheck() {
  cancelScrollSettleCheck();
  if (!isUnmounted && virtualEnabled.value && virtualMaxScrollTop.value > 0) {
    scrollSettleTimer = setTimeout(reconcileScrollTop, SCROLL_SETTLE_DELAY);
  }
}

function handleVirtualScroll(event: UniTreeVirtualScrollEvent) {
  // 无可滚动范围时不保留滞后的事件偏移；列表变短的原生归位仍由范围侦听器下发。
  if (virtualMaxScrollTop.value === 0) {
    syncScrollTop(0);
  } else {
    updateVirtualWindow(event);
  }
  scheduleScrollSettleCheck();
}

// 窗口变化后丢弃旧测量并重新校正，避免没有后续滚动事件时停留在旧偏移。
watch(
  [virtualEnabled, visibleTreeList, () => props.virtualHeight, () => props.virtualItemHeight],
  ([enabled], [wasEnabled]) => {
    if (!enabled) {
      scrollCommandVersion += 1;
      // 非虚拟模式已解除此绑定，清除旧指令，避免重新开启时重放。
      virtualScrollCommandTop.value = undefined;
    } else if (!wasEnabled && virtualMaxScrollTop.value === 0) {
      // 重新开启时若没有可滚动范围，不会安排测量，也不能保留关闭前的偏移。
      syncScrollTop(0);
    }
    scheduleScrollSettleCheck();
  },
  { flush: "sync" }
);

onBeforeUnmount(() => {
  isUnmounted = true;
  cancelScrollSettleCheck();
});

interface RenderedTreeItem {
  node: TreeNode;
  path: TreeNode[];
  domId: string;
}

const needsRenderedNodePath = computed(() => {
  return Boolean(slots.default || slots.icon || slots.label || slots.append);
});

const renderedTreeList = computed(() => {
  const includePath = needsRenderedNodePath.value;
  return virtualRenderedTreeList.value.map((node): RenderedTreeItem => ({
    node,
    path: includePath ? getNodePath(node) : [],
    domId: getNodeDomId(node)
  }));
});

async function handleToggleExpand(node: TreeNode) {
  if (node.loadError && !node.loading) {
    await retryLoadSafely(node);
    return;
  }

  const shouldLoad = !node.loaded;
  const payload = toggleExpand(node);
  if (!payload) {
    return;
  }

  emit("expand-change", payload);

  if (payload.expanded && shouldLoad) {
    await loadNodeSafely(node);
  }
}

function handleNodeClick(node: TreeNode) {
  emit("node-click", {
    id: node.id,
    node,
    path: getNodePath(node)
  });

  if (props.expandOnClickNode && isExpandable(node)) {
    void handleToggleExpand(node);
  }
  if (props.selectable && (props.checkOnClickNode || (props.checkOnClickLeaf && node.isLeaf))) {
    handleCheckChange(node);
  }
}

async function loadNode(node: TreeNode) {
  const wasLoaded = node.loaded;
  try {
    const children = await loadStateNode(node);
    if (!wasLoaded && node.loaded) {
      emit("load", { node, children });
    }
    return children;
  } catch (error) {
    emit("load-error", { node, error });
    throw error;
  }
}

async function loadNodeSafely(node: TreeNode) {
  try {
    await loadNode(node);
  } catch {
    // load-error 事件已携带失败信息，节点保持可重试。
  }
}

async function retryLoad(keyOrNode: TreeKey | TreeNode) {
  const node = typeof keyOrNode === "object" ? keyOrNode : getNode(keyOrNode);
  if (!node) {
    return [];
  }
  return loadNode(node);
}

async function retryLoadSafely(node: TreeNode) {
  try {
    await retryLoad(node);
  } catch {
    // load-error 事件已携带失败信息，后续仍可再次重试。
  }
}

async function applyVirtualScrollCommand(top: number) {
  cancelScrollSettleCheck();
  const commandVersion = ++scrollCommandVersion;
  // 先等待绑定落地，仅让最新请求继续，避免并发指令被同一轮渲染合并而丢失。
  await nextTick();
  if (isUnmounted || !virtualEnabled.value || commandVersion !== scrollCommandVersion) {
    return false;
  }
  // undefined 会恢复 scroll-view 的默认值 0，并非解除控制。保留上次指令，手势和测量
  // 不更新此绑定；重复定位时只用邻近数值重新触发指令，避免先跳回顶部。
  if ((virtualScrollCommandTop.value ?? 0) === top) {
    virtualScrollCommandTop.value = top > 0 ? Math.max(0, top - 1) : 1;
    await nextTick();
    if (isUnmounted || !virtualEnabled.value || commandVersion !== scrollCommandVersion) {
      return false;
    }
  }
  virtualScrollCommandTop.value = top;
  scheduleScrollSettleCheck();
  return true;
}

async function scrollToKey(key: TreeKey, options: TreeScrollToOptions = {}) {
  const node = getNode(key);
  if (!node) {
    return false;
  }

  if (options.expandParents !== false && node.parentIds.length > 0) {
    setExpandedKeys(node.parentIds, true);
  }
  await nextTick();

  const visibleIndex = visibleTreeList.value.findIndex((item) => item.id === key);
  if (visibleIndex === -1) {
    return false;
  }

  if (virtualEnabled.value) {
    if (!scrollToIndex(visibleIndex)) {
      return false;
    }
    return applyVirtualScrollCommand(virtualScrollTop.value);
  }

  scrollIntoView.value = "";
  await nextTick();
  scrollIntoView.value = getNodeDomId(node);
  return true;
}

// 可滚动范围变化时才将越界位置写回 scroll-view，不侦听滚动位置本身，
// 避免节流上报期间把用户手势拉回旧偏移。筛选恢复后也不会重新使用已失效的位置。
watch(virtualMaxScrollTop, () => {
  if (!virtualEnabled.value) {
    return;
  }

  const clampedScrollTop = clampScrollTopToRange();
  if (clampedScrollTop === null) {
    return;
  }

  void applyVirtualScrollCommand(clampedScrollTop);
});

function getNodeDomId(node: TreeNode) {
  const cachedDomId = nodeDomIds.get(node.id);
  if (cachedDomId) {
    return cachedDomId;
  }

  nextNodeDomId += 1;
  const domId = `utv-tree-node-${nextNodeDomId}`;
  nodeDomIds.set(node.id, domId);
  return domId;
}

function getLabelSegments(label: string) {
  const filterValue = String(props.filterValue ?? "").trim();
  if (!props.highlightFilter || !filterValue) {
    return [{ text: label, matched: false }];
  }

  const normalizedLabel = label.toLowerCase();
  const normalizedFilter = filterValue.toLowerCase();
  const segments: Array<{ text: string; matched: boolean }> = [];
  let startIndex = 0;
  let matchIndex = normalizedLabel.indexOf(normalizedFilter);

  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      segments.push({ text: label.slice(startIndex, matchIndex), matched: false });
    }
    const endIndex = matchIndex + filterValue.length;
    segments.push({ text: label.slice(matchIndex, endIndex), matched: true });
    startIndex = endIndex;
    matchIndex = normalizedLabel.indexOf(normalizedFilter, startIndex);
  }

  if (startIndex < label.length) {
    segments.push({ text: label.slice(startIndex), matched: false });
  }

  return segments.length > 0 ? segments : [{ text: label, matched: false }];
}

function emitFilterChange() {
  emit("filter-change", {
    value: props.filterValue,
    keys: getVisibleKeys(),
    nodes: getVisibleNodes(),
    matchedKeys: getMatchedKeys(),
    matchedNodes: getMatchedNodes()
  });
}

// 过滤条件或状态树变化时对账：只要本次或上一次处于过滤中就同步结果，避免未过滤时的数据更新触发噪音事件。
let previouslyHadFilterValue = false;

watch(
  () => [props.filterValue, props.filterMethod, treeVersion.value] as const,
  () => {
    const currentlyHasFilterValue = hasFilterValue.value;
    const shouldEmit = currentlyHasFilterValue || previouslyHadFilterValue;
    previouslyHadFilterValue = currentlyHasFilterValue;
    if (!shouldEmit) {
      return;
    }
    emitFilterChange();
  },
  { flush: "post", immediate: true }
);

// 状态树重建或懒加载追加后回收已移除节点的 DOM id，保持 scrollToKey 的查询目标与渲染一致。
watch(
  treeVersion,
  () => {
    for (const key of nodeDomIds.keys()) {
      if (!getNode(key)) {
        nodeDomIds.delete(key);
      }
    }
  },
  { flush: "sync" }
);

watch(
  reconciledModelValue,
  (payload) => {
    if (payload) {
      emit("update:modelValue", payload.value);
    }
  },
  { flush: "post" }
);

watch(
  pendingCheckChangePayload,
  (payload) => {
    if (payload) {
      commitSelectionChange(payload);
    }
  },
  { flush: "post" }
);

function handleCheckChange(node: TreeNode) {
  const payload = checkNode(node);
  if (!payload) {
    return;
  }

  commitSelectionChange(payload);
}

function commitSelectionChange(payload: TreeCheckChangePayload) {
  emit("update:modelValue", payload.value);
  emit("check-change", payload);
}

function setCheckedKeys(keys: TreeKey | TreeKey[], checked = true) {
  const payload = setStateCheckedKeys(keys, checked);
  if (payload) {
    commitSelectionChange(payload);
    return payload.value;
  }

  const checkedKeys = getCheckedKeys();
  return isMultiple.value ? checkedKeys : (checkedKeys[0] ?? null);
}

const exposed = {
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
  loadNode,
  retryLoad,
  scrollToKey
} satisfies UniTreeViewExposed;

defineExpose(exposed);
</script>

<style lang="scss">
@font-face {
  font-family: "uni-tree-iconfont";
  src: url('data:application/octet-stream;base64,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') format('truetype');
}
</style>

<style lang="scss" scoped>
@use "../../style/index.scss";
.uni-tree-view-container {
  width: 100%;
  height: 100%;
}
</style>