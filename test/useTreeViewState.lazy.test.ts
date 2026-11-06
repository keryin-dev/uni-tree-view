import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, isReactive, nextTick, watch } from "vue";
import { CHECK_STATUS_MAP } from "../packages/core/src/components/uni-tree-view/constants";
import type { TreeDataItem } from "../packages/core/src/components/uni-tree-view/types";
import {
  checkedKeys,
  cleanupTreeViewStateScopes,
  createDeferred,
  createLazyTreeData,
  createState,
  node,
  visibleKeys
} from "./helpers/treeViewState";

afterEach(cleanupTreeViewStateScopes);

describe("useTreeViewState: lazy loading", () => {
  it("supports lazy loading children on demand", async () => {
    const { state } = createState({
      data: createLazyTreeData(),
      loadMode: true,
      loadApi: async (targetNode) => {
        expect(targetNode.id).toBe("lazy-root");
        return [
          { id: "lazy-child", label: "Lazy child", leaf: true }
        ];
      }
    });

    const root = node(state, "lazy-root");
    expect(root.isLeaf).toBe(false);
    expect(root.loaded).toBe(false);
    expect(state.isExpandable(root)).toBe(true);

    const children = await state.loadNode(root);
    expect(children).toEqual([{ id: "lazy-child", label: "Lazy child", leaf: true }]);
    expect(root.loaded).toBe(true);
    expect(root.isLeaf).toBe(false);
    expect(state.treeList.value.map((item) => item.id)).toEqual(["lazy-root", "lazy-child"]);

    state.toggleExpand(root);
    expect(visibleKeys(state)).toEqual(["lazy-root", "lazy-child"]);
  });

  it("updates reactive node, path and child queries after lazy loading", async () => {
    const { state } = createState({
      data: createLazyTreeData(),
      loadMode: true,
      loadApi: () => [{ id: "lazy-child", label: "Lazy child", leaf: true }]
    });
    const child = computed(() => state.getNode("lazy-child"));
    const path = computed(() => state.getNodePath("lazy-child").map((item) => item.id));
    const hasChildren = computed(() => state.hasChildren("lazy-root"));
    const labels: Array<string | undefined> = [];
    const stop = watch(() => state.getNode("lazy-child")?.label, (label) => labels.push(label), { flush: "sync" });

    expect({ child: child.value, path: path.value, hasChildren: hasChildren.value }).toEqual({
      child: undefined,
      path: [],
      hasChildren: false
    });

    await state.loadNode(node(state, "lazy-root"));

    expect({ child: child.value, path: path.value, hasChildren: hasChildren.value }).toEqual({
      child: state.getNode("lazy-child"),
      path: ["lazy-root", "lazy-child"],
      hasChildren: true
    });
    expect(child.value).toBe(state.getNode("lazy-child"));
    expect(isReactive(child.value)).toBe(true);
    expect(labels).toEqual(["Lazy child"]);
    stop();
  });

  it("notifies synchronous node queries when a lazy response replaces an existing child", async () => {
    const { state } = createState({
      data: [{ id: "lazy-root", label: "Root", children: [{ id: "child", label: "Old child", leaf: true }] }],
      loadMode: true,
      alwaysFirstLoad: true,
      loadApi: () => [{ id: "child", label: "Fresh child", leaf: true }]
    });
    const labels: Array<string | undefined> = [];
    const stop = watch(() => state.getNode("child")?.label, (label) => labels.push(label), { flush: "sync" });

    await state.loadNode(node(state, "lazy-root"));

    expect(labels.slice(-1)).toEqual(["Fresh child"]);
    expect(state.getNode("child")?.label).toBe("Fresh child");
    stop();
  });

  it("inserts lazy children right after their parent and keeps later siblings in order", async () => {
    const childCount = 150_000;
    const { state } = createState({
      data: [
        { id: "first", label: "First", leaf: false },
        { id: "second", label: "Second", leaf: false }
      ],
      loadMode: true,
      loadApi: async (targetNode) => targetNode.id === "first"
        ? Array.from({ length: childCount }, (_, index) => ({ id: `first-${index}`, label: `First ${index}`, leaf: true }))
        : [{ id: "second-0", label: "Second 0", leaf: true }]
    });

    await state.loadNode(node(state, "second"));
    await state.loadNode(node(state, "first"));

    const ids = state.treeList.value.map((item) => item.id);
    expect(ids).toHaveLength(childCount + 3);
    expect(ids.slice(0, 2)).toEqual(["first", "first-0"]);
    expect(ids.slice(-3)).toEqual([`first-${childCount - 1}`, "second", "second-0"]);
    expect(node(state, "first-0").parentId).toBe("first");
  });

  it("supports custom leaf resolver and alwaysFirstLoad", async () => {
    const { state } = createState({
      data: [
        {
          id: "static-root",
          label: "Static root",
          children: [
            { id: "stale-child", label: "Stale child" }
          ]
        },
        { id: "forced-leaf", label: "Forced leaf" }
      ],
      loadMode: true,
      alwaysFirstLoad: true,
      isLeafFn: (item) => item.id === "forced-leaf",
      loadApi: () => [
        { id: "fresh-child", label: "Fresh child", leaf: true }
      ]
    });

    const staticRoot = node(state, "static-root");
    const forcedLeaf = node(state, "forced-leaf");
    expect(staticRoot.loaded).toBe(false);
    expect(state.isExpandable(staticRoot)).toBe(true);
    expect(forcedLeaf.isLeaf).toBe(true);
    expect(state.isExpandable(forcedLeaf)).toBe(false);

    await state.loadNode(staticRoot);
    expect(state.treeList.value.map((item) => item.id)).toEqual(["static-root", "fresh-child", "forced-leaf"]);
    expect(node(state, "fresh-child").parentId).toBe("static-root");
  });

  it.each([
    { multiple: false, checkStrictly: false, modelValue: "child" },
    { multiple: true, checkStrictly: true, modelValue: ["child"] },
    { multiple: true, checkStrictly: false, modelValue: ["child"] }
  ])("restores controlled selection when lazy loading replaces the same child key ($multiple, $checkStrictly)", async (selection) => {
    const { state } = createState({
      data: [{ id: "root", label: "Root", children: [
        { id: "child", label: "Old child", leaf: true },
        { id: "other", label: "Other", leaf: true }
      ] }],
      ...selection,
      loadMode: true,
      alwaysFirstLoad: true,
      loadApi: () => [
        { id: "child", label: "Fresh child", leaf: true },
        { id: "other", label: "Other", leaf: true }
      ]
    });
    const oldChild = node(state, "child");
    await state.loadNode(node(state, "root"));

    expect(node(state, "child")).not.toBe(oldChild);
    expect(state.getCheckedKeys()).toEqual(["child"]);
    expect(node(state, "child").label).toBe("Fresh child");
    expect(state.pendingCheckChangePayload.value).toBeNull();
  });

  it("preserves uncontrolled runtime choices when lazy loading replaces static children", async () => {
    const { state } = createState({
      data: [{ id: "root", label: "Root", children: [
        { id: "child", label: "Child", leaf: true },
        { id: "other", label: "Other", leaf: true }
      ] }],
      loadMode: true,
      alwaysFirstLoad: true,
      defaultCheckedKeys: ["other"],
      loadApi: () => [
        { id: "child", label: "Fresh child", leaf: true },
        { id: "other", label: "Other", leaf: true }
      ]
    });
    state.checkNode(node(state, "child"));
    await state.loadNode(node(state, "root"));

    expect(state.getCheckedKeys()).toEqual(["child"]);
  });

  it("does not inherit a derived parent selection over the controlled child keys", async () => {
    const { state } = createState({
      data: [{ id: "root", label: "Root", children: [{ id: "child", label: "Child", leaf: true }] }],
      multiple: true,
      modelValue: ["child"],
      loadMode: true,
      alwaysFirstLoad: true,
      loadApi: () => [
        { id: "child", label: "Fresh child", leaf: true },
        { id: "new-child", label: "New child", leaf: true }
      ]
    });
    expect(node(state, "root").checked).toBe(CHECK_STATUS_MAP.checked);
    await state.loadNode(node(state, "root"));

    expect(state.getCheckedKeys()).toEqual(["child"]);
    expect(state.getHalfCheckedKeys()).toEqual(["root"]);
  });

  it("keeps an unrelated uncontrolled choice while restoring replacement children", async () => {
    const { state } = createState({
      data: [
        { id: "root", label: "Root", children: [{ id: "child", label: "Child", leaf: true }] },
        { id: "other", label: "Other", leaf: true }
      ],
      multiple: true,
      checkStrictly: true,
      loadMode: true,
      alwaysFirstLoad: true,
      loadApi: () => [{ id: "child", label: "Fresh child", leaf: true }]
    });
    state.setCheckedKeys(["child", "other"]);
    await state.loadNode(node(state, "root"));

    expect(state.getCheckedKeys()).toEqual(["child", "other"]);
  });

  it("shares one in-flight state load and its resolved children", async () => {
    const request = createDeferred<TreeDataItem[]>();
    const loadApi = vi.fn(() => request.promise);
    const { state } = createState({ data: createLazyTreeData(), loadMode: true, loadApi });
    const root = node(state, "lazy-root");
    const first = state.loadNode(root);
    const second = state.loadNode(root);
    expect(second).toBe(first);

    const children = [{ id: "child", label: "Child", leaf: true }];
    request.resolve(children);
    expect(await Promise.all([first, second])).toEqual([children, children]);
    expect(loadApi).toHaveBeenCalledTimes(1);
    expect(root.loading).toBe(false);
  });

  it("does not call load-api with a node removed by a data refresh", async () => {
    const loadApi = vi.fn(() => []);
    const { props, state } = createState({ data: createLazyTreeData(), loadMode: true, loadApi });
    const root = node(state, "lazy-root");
    props.data = [];
    await nextTick();

    await expect(state.loadNode(root)).resolves.toEqual([]);
    expect(loadApi).not.toHaveBeenCalled();
    expect(root.loading).toBe(false);
  });

  it("keeps lazy nodes retryable after load failures", async () => {
    let attempts = 0;
    const { state } = createState({
      data: createLazyTreeData(),
      loadMode: true,
      loadApi: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("network error");
        }
        return [{ id: "lazy-child", label: "Lazy child", leaf: true }];
      }
    });

    const root = node(state, "lazy-root");
    await expect(state.loadNode(root)).rejects.toThrow("network error");
    expect(root.loading).toBe(false);
    expect(root.loaded).toBe(false);
    expect(root.loadError).toBeInstanceOf(Error);

    await expect(state.loadNode(root)).resolves.toEqual([
      { id: "lazy-child", label: "Lazy child", leaf: true }
    ]);
    expect(root.loadError).toBeNull();
    expect(root.loaded).toBe(true);
  });

  it("inherits checked state for lazy children in linked multiple mode", async () => {
    const { state } = createState({
      data: createLazyTreeData(),
      multiple: true,
      loadMode: true,
      loadApi: () => [
        { id: "lazy-child", label: "Lazy child", leaf: true }
      ]
    });

    const root = node(state, "lazy-root");
    state.setCheckedKeys(["lazy-root"]);
    await state.loadNode(root);

    expect(checkedKeys(state)).toEqual(["lazy-root", "lazy-child"]);
    expect(node(state, "lazy-child").checked).toBe(CHECK_STATUS_MAP.checked);
  });

  it("ignores stale lazy responses after replacing tree data", async () => {
    const request = createDeferred<TreeDataItem[]>();
    const { props, state } = createState({
      data: createLazyTreeData(),
      loadMode: true,
      loadApi: () => request.promise
    });

    const oldRoot = node(state, "lazy-root");
    const loading = state.loadNode(oldRoot);
    props.data = [{ id: "new-root", label: "New root", leaf: true }];
    await nextTick();

    request.resolve([{ id: "late-child", label: "Late child", leaf: true }]);
    await loading;

    expect(state.treeList.value.map((item) => item.id)).toEqual(["new-root"]);
    expect(state.nodeMap.value.has("late-child")).toBe(false);
    expect(oldRoot.loading).toBe(false);
  });

  it("keeps replacement nodes clean when stale lazy requests fail", async () => {
    const request = createDeferred<TreeDataItem[]>();
    const { props, state } = createState({
      data: createLazyTreeData(),
      loadMode: true,
      loadApi: () => request.promise
    });

    const oldRoot = node(state, "lazy-root");
    const loading = state.loadNode(oldRoot);
    props.data = [{ id: "lazy-root", label: "Replacement root", leaf: false }];
    await nextTick();
    const replacementRoot = node(state, "lazy-root");

    request.reject(new Error("stale request"));
    await expect(loading).resolves.toEqual([]);

    expect(oldRoot.loadError).toBeNull();
    expect(replacementRoot.loadError).toBeNull();
    expect(replacementRoot.loading).toBe(false);
  });

  it("clears stale pending selection after single-select model feedback", async () => {
    const { props, state } = createState({
      data: [
        { id: "loaded-node", label: "Loaded node", leaf: true },
        ...createLazyTreeData()
      ],
      loadMode: true,
      loadApi: () => [{ id: "lazy-child", label: "Lazy child", leaf: true }],
      modelValue: "lazy-child"
    });

    const payload = state.checkNode(node(state, "loaded-node"));
    props.modelValue = payload?.value ?? null;
    await nextTick();
    await state.loadNode(node(state, "lazy-root"));

    expect(node(state, "loaded-node").checked).toBe(CHECK_STATUS_MAP.checked);
    expect(node(state, "lazy-child").checked).toBe(CHECK_STATUS_MAP.unchecked);
  });

  it.each([
    { multiple: true, modelValue: ["lazy-child"] },
    { multiple: false, modelValue: "lazy-child" }
  ])("applies controlled lazy child selection after loading ($multiple)", async ({ modelValue, multiple }) => {
    const { state } = createState({
      data: createLazyTreeData(),
      multiple,
      modelValue,
      loadMode: true,
      loadApi: () => [{ id: "lazy-child", label: "Lazy child", leaf: true }]
    });

    expect(checkedKeys(state)).toEqual([]);
    await state.loadNode(node(state, "lazy-root"));

    expect(checkedKeys(state)).toContain("lazy-child");
    expect(node(state, "lazy-child").checked).toBe(CHECK_STATUS_MAP.checked);
  });

  it("applies unresolved default keys and updates linked parent state after lazy loading", async () => {
    const { state } = createState({
      data: createLazyTreeData(),
      multiple: true,
      defaultCheckedKeys: ["lazy-child"],
      loadMode: true,
      loadApi: () => [{ id: "lazy-child", label: "Lazy child", leaf: true }]
    });

    await state.loadNode(node(state, "lazy-root"));

    expect(checkedKeys(state)).toEqual(["lazy-root", "lazy-child"]);
  });

  it("does not reapply an unchecked default key during unrelated lazy loading", async () => {
    const { state } = createState({
      data: [
        { id: "default-node", label: "Default node", leaf: true },
        ...createLazyTreeData()
      ],
      multiple: true,
      checkStrictly: true,
      defaultCheckedKeys: ["default-node"],
      loadMode: true,
      loadApi: () => [{ id: "lazy-child", label: "Lazy child", leaf: true }]
    });

    state.checkNode(node(state, "default-node"));
    await state.loadNode(node(state, "lazy-root"));

    expect(checkedKeys(state)).toEqual([]);
  });

  it.each([
    { multiple: false, checkStrictly: false, modelValue: "leaf" },
    { multiple: true, checkStrictly: true, modelValue: ["leaf"] },
    { multiple: true, checkStrictly: false, modelValue: ["leaf"] }
  ])("restores a controlled key after successive lazy replacements ($multiple, $checkStrictly)", async (selection) => {
    const { state } = createState({
      data: [{ id: "root", label: "Root", children: [{ id: "branch", label: "Branch", children: [
        { id: "leaf", label: "Leaf", leaf: true }
      ] }] }],
      ...selection,
      loadMode: true,
      alwaysFirstLoad: true,
      loadApi: (target) => target.id === "root"
        ? [{ id: "branch", label: "Branch", leaf: false }]
        : [{ id: "leaf", label: "Leaf", leaf: true }, { id: "other", label: "Other", leaf: true }]
    });
    await state.loadNode(node(state, "root"));
    expect(state.getCheckedKeys()).toEqual([]);
    await state.loadNode(node(state, "branch"));
    expect(state.getCheckedKeys()).toEqual(["leaf"]);
    expect(state.pendingCheckChangePayload.value).toBeNull();
  });

  it.each([null, "other"])("replaces a queued controlled key with the latest value %s", async (nextValue) => {
    const { props, state } = createState({
      data: [{ id: "root", label: "Root", children: [{ id: "leaf", label: "Leaf", leaf: true }] }],
      modelValue: "leaf",
      loadMode: true,
      alwaysFirstLoad: true,
      loadApi: (target) => target.id === "root"
        ? [{ id: "branch", label: "Branch", leaf: false }]
        : [{ id: "leaf", label: "Leaf", leaf: true }, { id: "other", label: "Other", leaf: true }]
    });
    await state.loadNode(node(state, "root"));
    props.modelValue = nextValue;
    await nextTick();
    await state.loadNode(node(state, "branch"));
    expect(state.getCheckedKeys()).toEqual(nextValue === null ? [] : [nextValue]);
  });

  it.each([false, true])("keeps locked disabled selection when replacing a static child (controlled: %s)", async (controlled) => {
    const { props, state } = createState({
      data: [{ id: "root", label: "Root", children: [{ id: "locked", label: "Locked", disabled: true, leaf: true }] }],
      multiple: true,
      checkStrictly: true,
      checkedDisabled: true,
      packDisabledKey: false,
      ...(controlled ? { modelValue: ["locked"] } : { defaultCheckedKeys: ["locked"] }),
      loadMode: true,
      alwaysFirstLoad: true,
      loadApi: () => [
        { id: "locked", label: "Fresh locked", disabled: true, leaf: true },
        { id: "new", label: "New disabled", disabled: true, leaf: true }
      ]
    });
    props.checkedDisabled = false;
    await nextTick();
    await state.loadNode(node(state, "root"));
    expect(node(state, "locked").checked).toBe(CHECK_STATUS_MAP.checked);
    expect(node(state, "new").checked).toBe(CHECK_STATUS_MAP.unchecked);
    expect(state.getCheckedKeys()).toEqual([]);
  });

  it("recomputes leaf rules only after data refresh and ignores the superseded request", async () => {
    const request = createDeferred<TreeDataItem[]>();
    const { props, state } = createState({
      data: [{ id: "root", label: "Root" }],
      modelValue: "root",
      onlyRadioLeaf: true,
      loadMode: true,
      isLeafFn: () => false,
      loadApi: () => request.promise
    });
    const oldRoot = node(state, "root");
    const pending = state.loadNode(oldRoot);
    await nextTick();
    props.isLeafFn = () => true;
    await nextTick();
    expect(node(state, "root")).toBe(oldRoot);
    expect(oldRoot.isLeaf).toBe(false);
    expect(oldRoot.loading).toBe(true);
    props.data = [...props.data!];
    await nextTick();
    expect(node(state, "root")).not.toBe(oldRoot);
    expect(node(state, "root").isLeaf).toBe(true);
    expect(node(state, "root").loaded).toBe(true);
    expect(state.isExpandable(node(state, "root"))).toBe(false);
    expect(state.getCheckedKeys()).toEqual(["root"]);
    request.resolve([{ id: "stale", label: "Stale" }]);
    await pending;
    expect(state.getNode("stale")).toBeUndefined();
    props.isLeafFn = () => false;
    await nextTick();
    expect(node(state, "root").isLeaf).toBe(true);
    props.data = [...props.data!];
    await nextTick();
    expect(node(state, "root").loaded).toBe(false);
    expect(state.isExpandable(node(state, "root"))).toBe(true);
    expect(state.getCheckedKeys()).toEqual([]);
  });

  it("uses the latest leaf resolver for new lazy children without rebuilding existing nodes", async () => {
    const { props, state } = createState({
      data: [{ id: "root", label: "Root" }],
      loadMode: true,
      isLeafFn: () => false,
      loadApi: () => [{ id: "child", label: "Child", type: "leaf" }]
    });
    const root = node(state, "root");
    props.isLeafFn = (item) => item.type === "leaf";
    await nextTick();
    expect(node(state, "root")).toBe(root);
    await state.loadNode(root);
    expect(node(state, "child").isLeaf).toBe(true);
    expect(state.isExpandable(node(state, "child"))).toBe(false);
  });
});