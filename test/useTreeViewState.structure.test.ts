import { afterEach, describe, expect, it, vi } from "vitest";
import { isReactive, nextTick, watch } from "vue";
import { CHECK_STATUS_MAP } from "../packages/core/src/components/uni-tree-view/constants";
import type { TreeKey, TreeNode } from "../packages/core/src/components/uni-tree-view/types";
import {
  checkedKeys,
  cleanupTreeViewStateScopes,
  createLargeTreeData,
  createMappedTreeData,
  createState,
  createTreeData,
  node,
  visibleKeys
} from "./helpers/treeViewState";

afterEach(cleanupTreeViewStateScopes);

describe("useTreeViewState: structure, expansion and filtering", () => {
  it("flattens tree data and shows only root nodes initially", () => {
    const { state } = createState();

    expect(state.treeList.value).toHaveLength(10);
    expect(visibleKeys(state)).toEqual(["building-a", "building-b"]);
    expect(node(state, "room-a-201")).toMatchObject({
      id: "room-a-201",
      label: "A room 201",
      level: 2,
      parentId: "floor-a-2",
      parentIds: ["building-a", "floor-a-2"],
      isLeaf: true
    });
  });

  it("keeps visible nodes reactive and preserves their identity across expansion changes", () => {
    const { state } = createState();
    const target = node(state, "room-a-101");
    const changes: boolean[] = [];
    const stop = watch(() => target.visible, (visible) => changes.push(visible), { flush: "sync" });
    state.setExpandedKeys(["building-a", "floor-a-1"]);
    const visible = state.getVisibleNodes().find((item) => item.id === target.id);
    expect(visible).toBe(target);
    expect(isReactive(visible)).toBe(true);
    state.setExpandedKeys(["building-a"], false);
    state.setExpandedKeys(["building-a"]);
    expect(state.getVisibleNodes().find((item) => item.id === target.id)).toBe(target);
    expect(changes).toEqual([true, false, true]);
    stop();
  });

  it("notifies synchronous node queries after rebuilding the indexes", async () => {
    const { props, state } = createState();
    const labels: Array<string | undefined> = [];
    const stop = watch(() => state.getNode("building-a")?.label, (label) => labels.push(label), { flush: "sync" });

    props.data = [{ id: "building-a", label: "Replacement building" }];
    await nextTick();

    expect(labels.slice(-1)).toEqual(["Replacement building"]);
    expect(state.getNode("building-a")?.label).toBe("Replacement building");
    stop();
  });

  it("supports custom treeProps mapping", () => {
    const { state } = createState({
      data: createMappedTreeData(),
      treeProps: {
        id: "value",
        label: "name",
        children: "nodes",
        disabled: "blocked",
        append: "extra",
        icon: "glyph"
      }
    });

    expect(state.treeList.value.map((item) => item.id)).toEqual([1, 11]);
    expect(node(state, 11)).toMatchObject({
      label: "Child",
      append: "child-extra",
      icon: "C",
      path: ["Root", "Child"],
      disabled: true,
      parentId: 1
    });
  });

  it("rebuilds nodes when treeProps mapping changes", async () => {
    const { props, state } = createState({
      data: [
        {
          id: "default-id",
          label: "Default label",
          value: "mapped-id",
          name: "Mapped label"
        }
      ],
      treeProps: {
        id: "id",
        label: "label",
        children: "children"
      }
    });

    expect(state.getNode("default-id")?.label).toBe("Default label");

    props.treeProps!.label = "name";
    await nextTick();
    expect(state.getNode("default-id")?.label).toBe("Mapped label");

    props.treeProps!.id = "value";
    await nextTick();
    expect(state.getNode("default-id")).toBeUndefined();
    expect(state.getNode("mapped-id")?.label).toBe("Mapped label");
  });

  it("expands all ancestors of default expanded keys and supports expand/collapse methods", () => {
    const { state } = createState({
      defaultExpandedKeys: ["floor-a-2"]
    });

    expect(visibleKeys(state)).toEqual(["building-a", "floor-a-1", "floor-a-2", "room-a-201", "room-a-202", "building-b"]);
    expect(state.getExpandedKeys()).toEqual(["building-a", "floor-a-2"]);

    state.setExpandedKeys(["floor-a-2"], true);
    expect(visibleKeys(state)).toEqual([
      "building-a",
      "floor-a-1",
      "floor-a-2",
      "room-a-201",
      "room-a-202",
      "building-b"
    ]);

    state.collapseAll();
    expect(visibleKeys(state)).toEqual(["building-a", "building-b"]);
    expect(state.getExpandedKeys()).toEqual([]);

    state.expandAll();
    expect(state.getExpandedKeys()).toEqual(["building-a", "floor-a-1", "floor-a-2", "building-b"]);
  });

  it("hides a deeper expanded branch when an intermediate ancestor collapses", () => {
    const { state } = createState({
      defaultExpandAll: true
    });

    expect(visibleKeys(state)).toContain("room-a-101");

    // floor-a-1 保持 expanded，只折叠中间层 building-a：可见性靠祖先链判定，
    // 因此整棵子树都要隐藏，而 floor-a-1 自身的展开状态必须保留。
    state.toggleExpand(node(state, "building-a"));

    expect(visibleKeys(state)).toEqual(["building-a", "building-b", "floor-b-1", "floor-b-2"]);
    expect(node(state, "floor-a-1").expanded).toBe(true);
    expect(node(state, "room-a-101").visible).toBe(false);

    // 重新展开后，深层分支应按原本保留的展开状态直接恢复。
    state.toggleExpand(node(state, "building-a"));
    expect(visibleKeys(state)).toContain("room-a-101");
  });

  it("collapses expanded siblings when accordion mode is enabled", () => {
    const { state } = createState({
      accordion: true,
      defaultExpandAll: false
    });

    state.toggleExpand(node(state, "building-a"));
    state.toggleExpand(node(state, "building-b"));

    expect(node(state, "building-a").expanded).toBe(false);
    expect(node(state, "building-b").expanded).toBe(true);
    expect(state.getExpandedKeys()).toEqual(["building-b"]);
  });

  it("only collapses direct siblings in accordion mode", () => {
    const { state } = createState({
      accordion: true,
      defaultExpandedKeys: ["building-a", "floor-a-1"]
    });

    state.toggleExpand(node(state, "floor-a-2"));

    expect(node(state, "building-a").expanded).toBe(true);
    expect(node(state, "floor-a-1").expanded).toBe(false);
    expect(node(state, "floor-a-2").expanded).toBe(true);
  });

  it("can keep default expanded keys explicit without expanding their ancestors", async () => {
    const { props, state } = createState({
      defaultExpandedKeys: ["floor-a-2"],
      defaultExpandParent: false
    });

    expect(state.getExpandedKeys()).toEqual(["floor-a-2"]);
    expect(visibleKeys(state)).toEqual(["building-a", "building-b"]);

    props.defaultExpandParent = true;
    await nextTick();
    expect(state.getExpandedKeys()).toEqual(["building-a", "floor-a-2"]);
    expect(visibleKeys(state)).toContain("room-a-201");
  });

  it("expands checked ancestors only during initialization or expansion config changes", () => {
    const { state } = createState({
      modelValue: ["room-a-201"],
      expandChecked: true
    });

    expect(state.getExpandedKeys()).toEqual(["building-a", "floor-a-2"]);
    expect(visibleKeys(state)).toContain("room-a-201");
  });

  it("filters matched branches without mutating expanded state", async () => {
    const { props, state } = createState({
      defaultExpandedKeys: ["building-a"]
    });

    props.filterValue = "201";
    await nextTick();
    expect(visibleKeys(state)).toEqual(["building-a", "floor-a-2", "room-a-201"]);
    expect(state.getVisibleKeys()).toEqual(["building-a", "floor-a-2", "room-a-201"]);
    expect(state.getMatchedKeys()).toEqual(["room-a-201"]);
    expect(state.getMatchedNodes().map((item) => item.id)).toEqual(["room-a-201"]);
    expect(state.getExpandedKeys()).toEqual(["building-a"]);

    props.filterValue = "";
    await nextTick();
    expect(visibleKeys(state)).toEqual(["building-a", "floor-a-1", "floor-a-2", "building-b"]);
    expect(state.getMatchedKeys()).toEqual([]);
  });

  it("still matches descendants when a matched ancestor already exposes the whole branch", async () => {
    const matches = new Set<TreeKey>(["building-a", "floor-a-1", "room-a-101", "floor-b-1"]);
    const filterMethod = vi.fn((_value: string, targetNode: TreeNode) => matches.has(targetNode.id));
    const { props, state } = createState({ filterMethod });
    props.filterValue = "match";
    await nextTick();

    expect(filterMethod).toHaveBeenCalledTimes(10);
    expect(state.getMatchedKeys()).toEqual([...matches]);
    expect(state.getVisibleKeys()).toEqual([
      "building-a",
      "floor-a-1",
      "room-a-101",
      "room-a-102",
      "floor-a-2",
      "room-a-201",
      "room-a-202",
      "building-b",
      "floor-b-1"
    ]);
    for (const target of state.getMatchedNodes()) {
      expect(target).toBe(state.getNode(target.id));
    }
    expect(state.getExpandedKeys()).toEqual([]);

    props.filterValue = "";
    await nextTick();
    expect(state.getMatchedKeys()).toEqual([]);
    expect(state.getVisibleKeys()).toEqual(["building-a", "building-b"]);
  });

  it("supports custom filter matching", async () => {
    const { props, state } = createState({
      filterMethod: (value, targetNode) => {
        return String(targetNode.source.category ?? "") === value;
      },
      data: [
        {
          id: "root",
          label: "Root",
          children: [
            { id: "active", label: "Alpha", category: "active" },
            { id: "archived", label: "Beta", category: "archived" }
          ]
        }
      ]
    });

    props.filterValue = "active";
    await nextTick();

    expect(visibleKeys(state)).toEqual(["root", "active"]);
  });

  it("returns node paths for custom display and events", () => {
    const { state } = createState();

    expect(state.getNode("room-a-201")?.label).toBe("A room 201");
    expect(state.getNodePath("room-a-201").map((item) => item.id)).toEqual([
      "building-a",
      "floor-a-2",
      "room-a-201"
    ]);
    expect(node(state, "room-a-201").path).toEqual(["A building", "A floor 2", "A room 201"]);
    expect(state.getNodePath("missing")).toEqual([]);
  });

  it("preserves runtime expanded keys across data refresh when enabled", async () => {
    const { props, state } = createState({
      cacheExpandedKeys: true
    });

    state.toggleExpand(node(state, "building-b"));
    expect(visibleKeys(state)).toEqual(["building-a", "building-b", "floor-b-1", "floor-b-2"]);

    props.data = [
      ...createTreeData(),
      { id: "building-c", label: "C building" }
    ];
    await nextTick();

    expect(node(state, "building-b").expanded).toBe(true);
    expect(visibleKeys(state)).toEqual(["building-a", "building-b", "floor-b-1", "floor-b-2", "building-c"]);
  });

  it("does not expand a checked parent when controlled modelValue changes after selection", async () => {
    const { props, state } = createState({
      multiple: true,
      modelValue: ["floor-a-2"],
      defaultExpandedKeys: ["building-a"],
      expandChecked: true
    });

    expect(node(state, "building-b").expanded).toBe(false);
    expect(visibleKeys(state)).not.toContain("floor-b-1");

    const payload = state.checkNode(node(state, "building-b"));
    props.modelValue = payload?.value ?? null;
    await nextTick();

    expect(checkedKeys(state)).toEqual([
      "room-a-201",
      "building-b",
      "floor-b-1",
      "floor-b-2"
    ]);
    expect(state.getHalfCheckedKeys()).toEqual(["building-a", "floor-a-2"]);
    expect(node(state, "room-a-202").checked).toBe(CHECK_STATUS_MAP.unchecked);
    expect(node(state, "building-b").expanded).toBe(false);
    expect(visibleKeys(state)).not.toContain("floor-b-1");
  });

  it("updates tree shape when data changes without changing expansion on model-only updates", async () => {
    const { props, state } = createState({
      defaultExpandedKeys: ["building-a"]
    });

    expect(visibleKeys(state)).toEqual(["building-a", "floor-a-1", "floor-a-2", "building-b"]);

    props.modelValue = ["building-b"];
    await nextTick();
    expect(visibleKeys(state)).toEqual(["building-a", "floor-a-1", "floor-a-2", "building-b"]);

    props.data = [
      ...createTreeData(),
      { id: "building-c", label: "C building" }
    ];
    await nextTick();
    expect(visibleKeys(state)).toEqual(["building-a", "floor-a-1", "floor-a-2", "building-b", "building-c"]);
  });

  it("keeps visible node cache and linked selection correct with large trees", () => {
    const { state } = createState({
      data: createLargeTreeData(),
      multiple: true
    });

    expect(state.treeList.value).toHaveLength(10_525);
    expect(visibleKeys(state)).toHaveLength(25);

    state.expandAll();
    expect(state.visibleTreeList.value).toHaveLength(10_525);
    expect(state.getVisibleNodes()).toBe(state.visibleTreeList.value);

    const payload = state.checkNode(node(state, "province-0"));
    expect(payload?.keys).toHaveLength(421);
    expect(node(state, "province-0").checked).toBe(CHECK_STATUS_MAP.checked);
    expect(node(state, "city-0-0").checked).toBe(CHECK_STATUS_MAP.checked);
    expect(node(state, "town-0-0-0").checked).toBe(CHECK_STATUS_MAP.checked);

    state.checkNode(node(state, "town-0-0-0"));
    expect(node(state, "province-0").checked).toBe(CHECK_STATUS_MAP.indeterminate);
    expect(node(state, "city-0-0").checked).toBe(CHECK_STATUS_MAP.indeterminate);
  });

  it("flattens and filters a parent whose children exceed the spread argument limit", async () => {
    // 15 万个同级子节点超过 V8 展开参数上限，验证扁平化与过滤都不依赖 push(...items)。
    const childCount = 150_000;
    const { props, state } = createState({
      data: [{
        id: "root",
        label: "Root",
        children: Array.from({ length: childCount }, (_, index) => ({ id: `child-${index}`, label: `Child ${index}` }))
      }]
    });

    expect(state.treeList.value).toHaveLength(childCount + 1);
    expect(state.treeList.value[1].id).toBe("child-0");
    expect(state.treeList.value[childCount].id).toBe(`child-${childCount - 1}`);

    props.filterValue = "Root";
    await nextTick();
    expect(state.visibleTreeList.value).toHaveLength(childCount + 1);
  });

  it("warns once for missing and duplicate node keys in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    createState({
      data: [
        { label: "Missing one" },
        { label: "Missing two" },
        { id: "duplicate", label: "Duplicate one" },
        { id: "duplicate", label: "Duplicate two" }
      ]
    });

    const missingWarnings = warn.mock.calls.filter(([message]) => String(message).includes("缺失节点 key"));
    expect(missingWarnings).toHaveLength(1);
    expect(String(missingWarnings[0][0])).toContain("Missing one");
    expect(warn.mock.calls.filter(([message]) => String(message).includes("重复节点 key"))).toHaveLength(1);
    warn.mockRestore();
  });

  it.each([
    { defaultExpandedKeys: ["building-a"] },
    { defaultExpandAll: true },
    { expandChecked: true, defaultCheckedKeys: ["room-a-101"] }
  ])("preserves a cached collapse over expansion defaults %j", async (defaults) => {
    const { props, state } = createState({ cacheExpandedKeys: true, ...defaults });
    state.setExpandedKeys(["building-a"], false);
    props.data = [...createTreeData(), { id: "new-root", label: "New", children: [{ id: "new-child", label: "New child" }] }];
    await nextTick();
    expect(node(state, "building-a").expanded).toBe(false);
    expect(node(state, "new-root").expanded).toBe(Boolean(defaults.defaultExpandAll));
    expect(visibleKeys(state)).not.toContain("room-a-101");
  });

  it("resets cached states when expansion defaults change explicitly", async () => {
    const { props, state } = createState({ cacheExpandedKeys: true, defaultExpandedKeys: ["building-a"] });
    state.collapseAll();
    state.setExpandedKeys(["building-b"], true);
    props.defaultExpandedKeys = ["building-a", "floor-a-1"];
    await nextTick();
    expect(state.getExpandedKeys()).toEqual(["building-a", "floor-a-1"]);
    props.data = createTreeData();
    await nextTick();
    expect(state.getExpandedKeys()).toEqual(["building-a", "floor-a-1"]);
    props.cacheExpandedKeys = false;
    await nextTick();
    state.collapseAll();
    props.data = createTreeData();
    await nextTick();
    expect(state.getExpandedKeys()).toEqual(["building-a", "floor-a-1"]);
  });

  it.each([false, true])("restores cached expansion after a node leaves and returns (expanded: %s)", async (expanded) => {
    const { props, state } = createState({ cacheExpandedKeys: true, defaultExpandAll: !expanded });
    state.setExpandedKeys(["building-a"], expanded);
    props.data = createTreeData().filter((item) => item.id !== "building-a");
    await nextTick();
    expect(state.getNode("building-a")).toBeUndefined();
    props.data = [];
    await nextTick();
    props.data = [...createTreeData(), { id: "new", label: "New", children: [{ id: "new-child", label: "New child" }] }];
    await nextTick();
    expect(node(state, "building-a").expanded).toBe(expanded);
    expect(node(state, "new").expanded).toBe(!expanded);
    expect(visibleKeys(state).includes("floor-a-1")).toBe(expanded);
  });

  it.each(["defaults", "cache"])("clears absent-node expansion when resetting %s", async (reset) => {
    const { props, state } = createState({ cacheExpandedKeys: true });
    state.setExpandedKeys(["building-a"], true);
    props.data = [];
    await nextTick();
    if (reset === "defaults") {
      props.defaultExpandedKeys = ["building-b"];
    } else {
      props.cacheExpandedKeys = false;
    }
    await nextTick();
    if (reset === "cache") {
      props.cacheExpandedKeys = true;
      await nextTick();
    }
    props.data = createTreeData();
    await nextTick();
    expect(node(state, "building-a").expanded).toBe(false);
    expect(node(state, "building-b").expanded).toBe(reset === "defaults");
  });
});