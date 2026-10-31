import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
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
});