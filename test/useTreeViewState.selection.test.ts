import { afterEach, describe, expect, it } from "vitest";
import { nextTick, watch } from "vue";
import { CHECK_STATUS_MAP } from "../packages/core/src/components/uni-tree-view/constants";
import type { TreeKey } from "../packages/core/src/components/uni-tree-view/types";
import {
  checkedKeys,
  cleanupTreeViewStateScopes,
  createState,
  createTreeData,
  node,
  visibleKeys
} from "./helpers/treeViewState";

afterEach(cleanupTreeViewStateScopes);

describe("useTreeViewState: selection", () => {
  it("selects a parent and descendants in linked multiple mode", () => {
    const { state } = createState({
      multiple: true
    });

    const payload = state.checkNode(node(state, "building-b"));

    expect(payload?.value).toEqual(["building-b", "floor-b-1", "floor-b-2"]);
    expect(checkedKeys(state)).toEqual(["building-b", "floor-b-1", "floor-b-2"]);
    expect(state.getHalfCheckedKeys()).toEqual([]);
  });

  it("updates parent half checked state from children", () => {
    const { state } = createState({
      multiple: true
    });

    state.checkNode(node(state, "room-a-201"));

    expect(checkedKeys(state)).toEqual(["room-a-201"]);
    expect(state.getHalfCheckedKeys()).toEqual(["building-a", "floor-a-2"]);
    expect(node(state, "floor-a-2").checked).toBe(CHECK_STATUS_MAP.indeterminate);
    expect(node(state, "building-a").checked).toBe(CHECK_STATUS_MAP.indeterminate);
  });

  it("includes half-checked keys and nodes in selection payloads", () => {
    const { state } = createState({
      multiple: true
    });

    const payload = state.checkNode(node(state, "room-a-201"));

    expect(payload?.halfCheckedKeys).toEqual(["building-a", "floor-a-2"]);
    expect(payload?.halfCheckedNodes.map((item) => item.id)).toEqual([
      "building-a",
      "floor-a-2"
    ]);
  });

  it("skips disabled nodes during user selection but keeps parent state consistent", () => {
    const { state } = createState({
      multiple: true
    });

    const disabledPayload = state.checkNode(node(state, "room-a-202"));
    expect(disabledPayload).toBeNull();
    expect(checkedKeys(state)).toEqual([]);

    state.checkNode(node(state, "floor-a-2"));
    expect(checkedKeys(state)).toEqual(["room-a-201"]);
    expect(state.getHalfCheckedKeys()).toEqual(["building-a", "floor-a-2"]);
    expect(node(state, "room-a-202").checked).toBe(CHECK_STATUS_MAP.unchecked);
  });

  it("treats a disabled parent as a read-only summary of selectable children", () => {
    const data = [
      {
        id: "disabled-parent",
        label: "Disabled parent",
        disabled: true,
        children: [
          { id: "child-1", label: "Child 1" },
          { id: "child-2", label: "Child 2" }
        ]
      }
    ];
    const { state } = createState({ data, multiple: true });

    expect(state.checkNode(node(state, "disabled-parent"))).toBeNull();
    expect(state.checkNode(node(state, "child-1"))?.keys).toEqual(["child-1"]);
    expect(node(state, "disabled-parent").checked).toBe(CHECK_STATUS_MAP.indeterminate);

    expect(state.checkNode(node(state, "child-2"))?.keys).toEqual([
      "disabled-parent",
      "child-1",
      "child-2"
    ]);
    expect(node(state, "disabled-parent").checked).toBe(CHECK_STATUS_MAP.checked);
  });

  it("can omit a checked disabled parent from packed results without changing its visual state", () => {
    const { state } = createState({
      data: [
        {
          id: "disabled-parent",
          label: "Disabled parent",
          disabled: true,
          children: [
            { id: "child-1", label: "Child 1" },
            { id: "child-2", label: "Child 2" }
          ]
        }
      ],
      multiple: true,
      packDisabledKey: false
    });

    state.checkNode(node(state, "child-1"));
    state.checkNode(node(state, "child-2"));

    expect(node(state, "disabled-parent").checked).toBe(CHECK_STATUS_MAP.checked);
    expect(state.getCheckedKeys()).toEqual(["child-1", "child-2"]);
  });

  it.each([
    { initialKeys: ["child-1"], nextKeys: [] },
    { initialKeys: ["child-1", "child-2"], nextKeys: [] },
    { initialKeys: ["child-1"], nextKeys: ["other"] },
    { initialKeys: ["child-1", "child-2"], nextKeys: ["other"] }
  ])("recomputes disabled parent summaries after controlled selection changes ($initialKeys -> $nextKeys)", async ({ initialKeys, nextKeys }) => {
    const { props, state } = createState({
      data: [
        { id: "root", label: "Root", disabled: true, children: [
          { id: "branch", label: "Branch", disabled: true, children: [
            { id: "child-1", label: "Child 1" },
            { id: "child-2", label: "Child 2" }
          ] }
        ] },
        { id: "other", label: "Other" }
      ],
      multiple: true,
      modelValue: initialKeys
    });
    expect(node(state, "root").checked).not.toBe(CHECK_STATUS_MAP.unchecked);

    props.modelValue = nextKeys;
    await nextTick();

    expect(state.getCheckedKeys()).toEqual(nextKeys);
    expect(state.getHalfCheckedKeys()).toEqual([]);
    expect(node(state, "root").checked).toBe(CHECK_STATUS_MAP.unchecked);
    expect(node(state, "branch").checked).toBe(CHECK_STATUS_MAP.unchecked);
  });

  it("keeps disabled leaf selection locked while recomputing parent summaries on clear", async () => {
    const { props, state } = createState({
      data: [{ id: "root", label: "Root", disabled: true, children: [
        { id: "locked", label: "Locked", disabled: true },
        { id: "child", label: "Child" }
      ] }],
      multiple: true,
      checkedDisabled: true,
      modelValue: ["locked", "child"]
    });
    props.checkedDisabled = false;
    await nextTick();
    props.modelValue = [];
    await nextTick();

    expect(state.getCheckedKeys()).toEqual(["locked"]);
    expect(state.getHalfCheckedKeys()).toEqual(["root"]);
  });

  it("keeps disabled nodes unchanged while applying configured linked selection", () => {
    const blocked = createState({
      multiple: true,
      modelValue: ["floor-a-2"]
    });

    expect(node(blocked.state, "room-a-202").checked).toBe(CHECK_STATUS_MAP.unchecked);
    expect(checkedKeys(blocked.state)).toEqual(["room-a-201"]);
    expect(blocked.state.getHalfCheckedKeys()).toEqual(["building-a", "floor-a-2"]);

    const allowed = createState({
      multiple: true,
      checkedDisabled: true,
      modelValue: ["floor-a-2"]
    });

    expect(node(allowed.state, "room-a-202").checked).toBe(CHECK_STATUS_MAP.checked);
    expect(checkedKeys(allowed.state)).toEqual(["floor-a-2", "room-a-201", "room-a-202"]);
  });

  it("preserves locked disabled states during method select-all and clear", async () => {
    const blocked = createState({
      multiple: true
    });

    blocked.state.setCheckedKeys(blocked.state.getUncheckedKeys(), true);
    expect(node(blocked.state, "room-a-202").checked).toBe(CHECK_STATUS_MAP.unchecked);

    const locked = createState({
      multiple: true,
      checkedDisabled: true,
      modelValue: ["room-a-202"]
    });

    locked.props.checkedDisabled = false;
    await nextTick();
    expect(node(locked.state, "room-a-202").checked).toBe(CHECK_STATUS_MAP.checked);

    locked.state.setCheckedKeys(locked.state.getCheckedKeys(), false);
    expect(node(locked.state, "room-a-202").checked).toBe(CHECK_STATUS_MAP.checked);
    expect(locked.state.getHalfCheckedKeys()).toEqual(["building-a", "floor-a-2"]);
  });

  it("keeps parent and children independent in checkStrictly mode", () => {
    const { state } = createState({
      multiple: true,
      checkStrictly: true
    });

    state.checkNode(node(state, "building-a"));

    expect(checkedKeys(state)).toEqual(["building-a"]);
    expect(state.getHalfCheckedKeys()).toEqual([]);
    expect(node(state, "floor-a-1").checked).toBe(CHECK_STATUS_MAP.unchecked);
  });

  it("supports single selection and onlyRadioLeaf", () => {
    const { state } = createState({
      onlyRadioLeaf: true
    });

    expect(state.checkNode(node(state, "building-a"))).toBeNull();

    const firstPayload = state.checkNode(node(state, "room-a-101"));
    expect(firstPayload?.value).toBe("room-a-101");
    expect(checkedKeys(state)).toEqual(["room-a-101"]);

    const secondPayload = state.checkNode(node(state, "room-a-102"));
    expect(secondPayload?.value).toBe("room-a-102");
    expect(checkedKeys(state)).toEqual(["room-a-102"]);

    const uncheckedPayload = state.checkNode(node(state, "room-a-102"));
    expect(uncheckedPayload?.value).toBeNull();
    expect(checkedKeys(state)).toEqual([]);
  });

  it("keeps selection visibility independent from single or multiple mode", () => {
    const single = createState();

    const singlePayload = single.state.checkNode(node(single.state, "building-b"));
    expect(single.state.isMultiple.value).toBe(false);
    expect(singlePayload?.value).toBe("building-b");
    expect(checkedKeys(single.state)).toEqual(["building-b"]);
    expect(node(single.state, "floor-b-1").checked).toBe(CHECK_STATUS_MAP.unchecked);

    const multiple = createState({
      multiple: true
    });
    const multiplePayload = multiple.state.checkNode(node(multiple.state, "building-b"));
    expect(multiple.state.isMultiple.value).toBe(true);
    expect(multiplePayload?.value).toEqual(["building-b", "floor-b-1", "floor-b-2"]);
  });

  it("exposes checked node query and mutation methods", () => {
    const { state } = createState({
      multiple: true
    });

    const checkedPayload = state.setCheckedKeys(["floor-b-1", "floor-b-2"]);
    expect(checkedPayload?.keys).toEqual(["building-b", "floor-b-1", "floor-b-2"]);
    expect(state.getCheckedNodes().map((item) => item.id)).toEqual(["building-b", "floor-b-1", "floor-b-2"]);
    expect(state.getUncheckedKeys()).toContain("building-a");

    const uncheckedPayload = state.setCheckedKeys(["floor-b-1"], false);
    expect(uncheckedPayload?.keys).toEqual(["floor-b-2"]);
    expect(state.getHalfCheckedKeys()).toEqual(["building-b"]);
  });

  it("keeps selection state while filtering empty results", async () => {
    const { props, state } = createState();

    state.checkNode(node(state, "room-a-201"));
    props.filterValue = "missing";
    await nextTick();

    expect(visibleKeys(state)).toEqual([]);
    expect(checkedKeys(state)).toEqual(["room-a-201"]);
  });

  it("preserves uncontrolled checked state across immutable data refreshes", async () => {
    const { props, state } = createState({
      multiple: true,
      checkStrictly: true,
      defaultCheckedKeys: ["room-a-101"]
    });

    state.checkNode(node(state, "floor-b-1"));
    props.data = createTreeData();
    await nextTick();

    expect(checkedKeys(state)).toEqual(["room-a-101", "floor-b-1"]);

    props.data = createTreeData().filter((item) => item.id !== "building-b");
    await nextTick();
    expect(checkedKeys(state)).toEqual(["room-a-101"]);

    props.data = createTreeData();
    await nextTick();
    expect(checkedKeys(state)).toEqual(["room-a-101"]);
  });

  it("keeps controlled selection authoritative across data refreshes", async () => {
    const { props, state } = createState({
      multiple: true,
      checkStrictly: true,
      modelValue: ["floor-b-1"]
    });

    state.checkNode(node(state, "room-a-101"));
    props.data = createTreeData();
    await nextTick();

    expect(checkedKeys(state)).toEqual(["floor-b-1"]);
  });

  it("replays configured selection when checkStrictly changes", async () => {
    const { props, state } = createState({
      multiple: true,
      checkStrictly: true,
      modelValue: ["floor-a-1"]
    });

    expect(checkedKeys(state)).toEqual(["floor-a-1"]);

    props.checkStrictly = false;
    await nextTick();

    expect(checkedKeys(state)).toEqual([
      "floor-a-1",
      "room-a-101",
      "room-a-102"
    ]);
  });

  it("replays configured selection when multiple changes", async () => {
    const { props, state } = createState({
      modelValue: "floor-a-1"
    });

    expect(checkedKeys(state)).toEqual(["floor-a-1"]);

    props.multiple = true;
    await nextTick();

    expect(checkedKeys(state)).toEqual([
      "floor-a-1",
      "room-a-101",
      "room-a-102"
    ]);
  });

  it("skips replaying an equivalent controlled modelValue feedback", async () => {
    const { props, state } = createState({
      multiple: true,
      checkStrictly: true,
      modelValue: []
    });
    const target = node(state, "room-a-101");
    const checkedChanges: string[] = [];
    const stop = watch(
      () => target.checked,
      (checked) => checkedChanges.push(checked),
      { flush: "sync" }
    );

    const payload = state.checkNode(target);
    props.modelValue = payload?.value ?? null;
    await nextTick();

    expect(checkedChanges).toEqual([CHECK_STATUS_MAP.checked]);
    expect(checkedKeys(state)).toEqual(["room-a-101"]);

    props.modelValue = ["floor-b-1"];
    await nextTick();

    expect(checkedKeys(state)).toEqual(["floor-b-1"]);
    stop();
  });

  it.each(["modelValue", "defaultCheckedKeys"] as const)("tracks in-place %s changes even when joined key signatures collide", async (prop) => {
    const keys: TreeKey[] = [1, "1", "a,b", "c", "a", "b,c"];
    const { props, state } = createState({
      data: keys.map((id) => ({ id, label: String(id) })),
      multiple: true,
      checkStrictly: true,
      [prop]: [1, "a,b", "c"]
    });
    const configuredKeys = props[prop] as TreeKey[];

    expect(checkedKeys(state)).toEqual([1, "a,b", "c"]);

    configuredKeys[0] = "1";
    await nextTick();
    expect(checkedKeys(state)).toEqual(["1", "a,b", "c"]);

    configuredKeys.splice(1, 2, "a", "b,c");
    await nextTick();
    expect(checkedKeys(state)).toEqual(["1", "a", "b,c"]);

    configuredKeys.length = 0;
    await nextTick();
    expect(checkedKeys(state)).toEqual([]);
  });

  it("resolves packDisabledKey with a packing default", () => {
    const excluded = createState({
      checkedDisabled: true,
      packDisabledKey: false
    });
    excluded.state.setCheckedKeys("room-a-202");
    expect(excluded.state.getCheckedKeys()).toEqual([]);

    const included = createState({
      checkedDisabled: true,
      packDisabledKey: true
    });
    included.state.setCheckedKeys("room-a-202");
    expect(included.state.getCheckedKeys()).toEqual(["room-a-202"]);

    const omitted = createState({ checkedDisabled: true });
    omitted.state.setCheckedKeys("room-a-202");
    expect(omitted.state.getCheckedKeys()).toEqual(["room-a-202"]);
  });

  it("preserves disabled checked nodes internally when packing excludes them", async () => {
    const { props, state } = createState({
      multiple: true,
      checkStrictly: true,
      checkedDisabled: true,
      packDisabledKey: false
    });

    state.setCheckedKeys(["room-a-202"]);
    expect(checkedKeys(state)).toEqual([]);
    props.data = createTreeData();
    await nextTick();

    expect(node(state, "room-a-202").checked).toBe(CHECK_STATUS_MAP.checked);
    expect(checkedKeys(state)).toEqual([]);
  });

  it("honors checkedDisabled and packDisabledKey options", () => {
    const blocked = createState();

    expect(blocked.state.setCheckedKeys(["room-a-202"])).toBeNull();
    expect(blocked.state.checkNode(node(blocked.state, "room-a-202"))).toBeNull();

    const allowed = createState({
      checkedDisabled: true,
      packDisabledKey: false
    });

    const payload = allowed.state.setCheckedKeys(["room-a-202"]);
    expect(node(allowed.state, "room-a-202").checked).toBe(CHECK_STATUS_MAP.checked);
    expect(payload?.keys).toEqual([]);
    expect(allowed.state.getCheckedKeys()).toEqual([]);
  });
});