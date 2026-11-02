// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import type {
  TreeCheckChangePayload,
  TreeExpandPayload,
  TreeFilterPayload,
  TreeLoadErrorPayload,
  TreeLoadPayload,
  TreeNodeClickPayload,
  UniTreeViewExposed
} from "../packages/core/src/components/uni-tree-view/types";
import UniTreeView from "../packages/core/src/components/uni-tree-view/uni-tree-view.vue";
import { createDeferred } from "./helpers/treeViewState";

const treeData = [
  {
    id: "root",
    label: "Alpha root",
    children: [
      { id: "child", label: "Alpha child" }
    ]
  }
];

function exposed(wrapper: ReturnType<typeof mount>) {
  return wrapper.vm as unknown as UniTreeViewExposed;
}

describe("uni-tree-view component", () => {
  it("exposes the public methods and emits complete selection payloads", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        defaultExpandAll: true,
        multiple: true,
        selectable: true
      }
    });
    const tree = exposed(wrapper);

    expect([
      "setCheckedKeys",
      "getCheckedKeys",
      "getHalfCheckedKeys",
      "getUncheckedKeys",
      "getCheckedNodes",
      "getHalfCheckedNodes",
      "getUncheckedNodes",
      "setExpandedKeys",
      "getExpandedKeys",
      "getUnexpandedKeys",
      "getVisibleKeys",
      "getMatchedKeys",
      "getExpandedNodes",
      "getUnexpandedNodes",
      "getVisibleNodes",
      "getMatchedNodes",
      "getNode",
      "getNodePath",
      "expandAll",
      "collapseAll",
      "loadNode",
      "retryLoad",
      "scrollToKey"
    ].every((method) => typeof tree[method as keyof UniTreeViewExposed] === "function")).toBe(true);

    tree.setCheckedKeys("child");
    await nextTick();

    const payload = wrapper.emitted<TreeCheckChangePayload[]>("check-change")?.[0]?.[0];
    expect(tree.getCheckedKeys()).toEqual(["root", "child"]);
    expect(payload).toMatchObject({
      value: ["root", "child"],
      keys: ["root", "child"],
      node: { id: "child" }
    });
    expect(payload?.nodes.map((node) => node.id)).toEqual(["root", "child"]);
    expect(payload?.halfCheckedKeys).toEqual([]);
    expect(payload?.halfCheckedNodes).toEqual([]);
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["root", "child"]]);
  });

  it("emits selection and node-click payloads through the row interaction chain", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        defaultExpandAll: true,
        multiple: true,
        selectable: true,
        checkOnClickNode: true
      }
    });

    await wrapper.findAll(".utv-tree-item")[1].trigger("click");

    const checkPayload = wrapper.emitted<TreeCheckChangePayload[]>("check-change")?.[0]?.[0];
    const clickPayload = wrapper.emitted<TreeNodeClickPayload[]>("node-click")?.[0]?.[0];
    expect(checkPayload).toMatchObject({
      value: ["root", "child"],
      keys: ["root", "child"],
      node: { id: "child" }
    });
    expect(checkPayload?.nodes.map((node) => node.id)).toEqual(["root", "child"]);
    expect(clickPayload).toMatchObject({
      id: "child",
      node: { id: "child" }
    });
    expect(clickPayload?.path.map((node) => node.id)).toEqual(["root", "child"]);
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["root", "child"]]);
  });

  it("expands and checks a node when both row click behaviors are enabled", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        multiple: true,
        selectable: true,
        expandOnClickNode: true,
        checkOnClickNode: true
      }
    });

    await wrapper.find(".utv-tree-item").trigger("click");

    expect(wrapper.findAll(".utv-tree-item")).toHaveLength(2);
    expect(exposed(wrapper).getCheckedKeys()).toEqual(["root", "child"]);
    expect(wrapper.emitted("node-click")).toHaveLength(1);
    expect(wrapper.emitted("expand-change")).toHaveLength(1);
    expect(wrapper.emitted("check-change")).toHaveLength(1);
  });

  it("toggles selection when clicking a node label", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        defaultExpandAll: true,
        multiple: true,
        selectable: true,
        checkOnClickNode: true
      }
    });

    const label = wrapper.findAll(".utv-tree-node-label")[1];
    await label.trigger("click");

    expect(exposed(wrapper).getCheckedKeys()).toEqual(["root", "child"]);
    expect(wrapper.emitted("check-change")).toHaveLength(1);

    await label.trigger("click");

    expect(exposed(wrapper).getCheckedKeys()).toEqual([]);
    expect(wrapper.emitted("check-change")).toHaveLength(2);
  });

  it("checks leaf nodes from row clicks without enabling parent row checks", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        defaultExpandAll: true,
        multiple: true,
        selectable: true,
        checkOnClickLeaf: true
      }
    });

    await wrapper.findAll(".utv-tree-item")[0].trigger("click");
    expect(exposed(wrapper).getCheckedKeys()).toEqual([]);
    expect(wrapper.emitted("check-change")).toBeUndefined();

    await wrapper.findAll(".utv-tree-item")[1].trigger("click");

    expect(exposed(wrapper).getCheckedKeys()).toEqual(["root", "child"]);
    expect(wrapper.emitted("check-change")).toHaveLength(1);
  });

  it("supports a dedicated empty-filter slot without changing the empty slot fallback", () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        filterValue: "missing"
      },
      slots: {
        "empty-filter": ({ filterValue }) => `No matches:${filterValue}`,
        empty: () => "Generic empty"
      }
    });

    expect(wrapper.find(".utv-tree-empty").text()).toBe("No matches:missing");
  });

  it("renders the default empty state and forwards filterValue to the empty slot", () => {
    const defaultWrapper = mount(UniTreeView, {
      props: { data: [] }
    });
    expect(defaultWrapper.find(".utv-tree-empty").text()).toBe("暂无数据");

    const slotWrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        filterValue: "missing"
      },
      slots: {
        empty: ({ filterValue }) => `Empty:${filterValue}`
      }
    });
    expect(slotWrapper.find(".utv-tree-empty").text()).toBe("Empty:missing");
  });

  it("highlights repeated case-insensitive matches at label boundaries", () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "matches", label: "Alpha alpha ALPHA" }],
        filterValue: "alpha"
      }
    });
    const matches = wrapper.findAll(".utv-tree-node-label__match");

    expect(matches).toHaveLength(3);
    expect(matches.map((match) => match.text())).toEqual(["Alpha", "alpha", "ALPHA"]);
  });

  it("emits expand-change payloads from the arrow interaction", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        multiple: true,
        selectable: true,
        checkOnClickNode: true
      }
    });

    await wrapper.find(".utv-tree-item__arrow-icon").trigger("click");

    const firstPayload = wrapper.emitted<TreeExpandPayload[]>("expand-change")?.[0]?.[0];
    expect(firstPayload).toMatchObject({
      expanded: true,
      node: { id: "root" }
    });
    expect(wrapper.findAll(".utv-tree-item")).toHaveLength(2);
    expect(exposed(wrapper).getCheckedKeys()).toEqual([]);
    expect(wrapper.emitted("check-change")).toBeUndefined();
    expect(wrapper.emitted("node-click")).toBeUndefined();

    await wrapper.find(".utv-tree-item__arrow-icon").trigger("click");
    const secondPayload = wrapper.emitted<TreeExpandPayload[]>("expand-change")?.[1]?.[0];
    expect(secondPayload).toMatchObject({
      expanded: false,
      node: { id: "root" }
    });
    expect(wrapper.findAll(".utv-tree-item")).toHaveLength(1);
    expect(exposed(wrapper).getCheckedKeys()).toEqual([]);
    expect(wrapper.emitted("check-change")).toBeUndefined();
    expect(wrapper.emitted("node-click")).toBeUndefined();
  });

  it("routes nested checkbox taps without triggering row click behavior", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        multiple: true,
        selectable: true,
        expandOnClickNode: true
      }
    });

    await wrapper.find(".utv-tree-item__checkbox-icon").trigger("click");

    expect(exposed(wrapper).getCheckedKeys()).toEqual(["root", "child"]);
    expect(wrapper.findAll(".utv-tree-item")).toHaveLength(1);
    expect(wrapper.emitted("check-change")).toHaveLength(1);
    expect(wrapper.emitted("node-click")).toBeUndefined();
    expect(wrapper.emitted("expand-change")).toBeUndefined();
  });

  it("keeps the row state layer mounted while selection changes", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        multiple: true,
        selectable: true
      }
    });

    const row = wrapper.find(".utv-tree-item");
    expect(row.findAll(".utv-tree-item__state-layer")).toHaveLength(1);
    expect(row.classes()).not.toContain("is-checked");

    await row.find(".utv-tree-item__checkbox-icon").trigger("click");

    expect(row.findAll(".utv-tree-item__state-layer")).toHaveLength(1);
    expect(row.classes()).toContain("is-checked");

    await row.find(".utv-tree-item__checkbox-icon").trigger("click");

    expect(row.findAll(".utv-tree-item__state-layer")).toHaveLength(1);
    expect(row.classes()).not.toContain("is-checked");
  });

  it("isolates right checkbox taps from row click behavior", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        multiple: true,
        selectable: true,
        selectionPlacement: "right",
        checkOnClickNode: true,
        expandOnClickNode: true
      }
    });

    await wrapper.find(".utv-tree-item__checkbox").trigger("click");

    expect(exposed(wrapper).getCheckedKeys()).toEqual(["root", "child"]);
    expect(wrapper.findAll(".utv-tree-item")).toHaveLength(1);
    expect(wrapper.emitted("check-change")).toHaveLength(1);
    expect(wrapper.emitted("node-click")).toBeUndefined();
    expect(wrapper.emitted("expand-change")).toBeUndefined();
  });

  it("keeps rapid nested control clicks isolated from row behavior", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        defaultExpandAll: true,
        multiple: true,
        selectable: true,
        checkOnClickNode: true,
        expandOnClickNode: true
      }
    });

    const arrow = wrapper.find(".utv-tree-item__arrow-icon");
    await Promise.all([
      arrow.trigger("click"),
      arrow.trigger("click")
    ]);

    expect(wrapper.emitted("expand-change")).toHaveLength(2);
    expect(wrapper.findAll(".utv-tree-item")).toHaveLength(2);

    const checkbox = wrapper.find(".utv-tree-item__checkbox-icon");
    await Promise.all([
      checkbox.trigger("click"),
      checkbox.trigger("click")
    ]);

    expect(wrapper.emitted("check-change")).toHaveLength(2);
    expect(exposed(wrapper).getCheckedKeys()).toEqual([]);
    expect(wrapper.emitted("node-click")).toBeUndefined();
  });

  it("emits filter-change with the filtered visible nodes", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData
      }
    });

    await wrapper.setProps({ filterValue: "child" });
    await nextTick();

    const filterEvents = wrapper.emitted<TreeFilterPayload[]>("filter-change") ?? [];
    const payload = filterEvents[filterEvents.length - 1]?.[0];
    expect(payload).toMatchObject({
      value: "child",
      keys: ["root", "child"],
      matchedKeys: ["child"]
    });
    expect(payload?.nodes.map((node) => node.id)).toEqual(["root", "child"]);
    expect(payload?.matchedNodes.map((node) => node.id)).toEqual(["child"]);

    await wrapper.setProps({ filterValue: "" });
    await nextTick();
    const clearedEvents = wrapper.emitted<TreeFilterPayload[]>("filter-change") ?? [];
    const clearedPayload = clearedEvents[clearedEvents.length - 1]?.[0];
    expect(clearedPayload?.matchedKeys).toEqual([]);
    expect(clearedPayload?.matchedNodes).toEqual([]);
  });

  it("emits load payloads after lazy children resolve", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "lazy-root", label: "Lazy root", leaf: false }],
        loadMode: true,
        loadApi: async () => [{ id: "lazy-child", label: "Lazy child", leaf: true }]
      }
    });

    await wrapper.find(".utv-tree-item__arrow-icon").trigger("click");
    await flushPromises();

    const payload = wrapper.emitted<TreeLoadPayload[]>("load")?.[0]?.[0];
    expect(payload).toMatchObject({
      node: { id: "lazy-root" },
      children: [{ id: "lazy-child", label: "Lazy child", leaf: true }]
    });
    expect(wrapper.text()).toContain("Lazy child");
  });

  it.each([false, true])("shares concurrent load calls and emits one success event (async: %s)", async (asynchronous) => {
    const children = [{ id: "child", label: "Child", leaf: true }];
    const request = createDeferred<typeof children>();
    let calls = 0;
    const wrapper = mount(UniTreeView, { props: {
      data: [{ id: "root", label: "Root", leaf: false }],
      loadMode: true,
      loadApi: () => {
        calls += 1;
        return asynchronous ? request.promise : children;
      }
    } });
    const tree = exposed(wrapper);
    const root = tree.getNode("root")!;
    const first = tree.loadNode(root);
    const second = tree.retryLoad(root.id);
    expect(second).toBe(first);
    request.resolve(children);

    expect(await Promise.all([first, second])).toEqual([children, children]);
    expect(calls).toBe(1);
    expect(wrapper.emitted("load")).toHaveLength(1);
    expect(wrapper.emitted<TreeLoadPayload[]>("load")?.[0]?.[0].children).toEqual(children);
    expect(await tree.loadNode(root)).toEqual([]);
    expect(wrapper.emitted("load")).toHaveLength(1);
    wrapper.unmount();
  });

  it.each([false, true])("shares concurrent failures, emits one error and permits a fresh retry (async: %s)", async (asynchronous) => {
    const request = createDeferred<TreeLoadPayload["children"]>();
    const error = new Error("request failed");
    let calls = 0;
    const wrapper = mount(UniTreeView, { props: {
      data: [{ id: "root", label: "Root", leaf: false }],
      loadMode: true,
      loadApi: () => {
        calls += 1;
        if (calls > 1) {
          return [];
        }
        if (!asynchronous) {
          throw error;
        }
        return request.promise;
      }
    } });
    const tree = exposed(wrapper);
    const root = tree.getNode("root")!;
    const first = tree.loadNode(root);
    const second = tree.loadNode(root);
    const outcomes = Promise.allSettled([first, second]);
    if (asynchronous) {
      request.reject(error);
    }

    expect(await outcomes).toEqual([
      { status: "rejected", reason: error },
      { status: "rejected", reason: error }
    ]);
    expect(wrapper.emitted("load-error")).toHaveLength(1);
    expect(root.loading).toBe(false);
    expect(await tree.retryLoad(root.id)).toEqual([]);
    expect(calls).toBe(2);
    expect(wrapper.emitted("load")).toHaveLength(1);
    wrapper.unmount();
  });

  it.each([false, true])("keeps a new user single choice when an older pending key is loaded (clear: %s)", async (clear) => {
    const wrapper = mount(UniTreeView, { props: {
      data: [
        { id: "root", label: "Root", leaf: false },
        { id: "other", label: "Other", leaf: true }
      ],
      selectable: true,
      checkOnClickNode: true,
      loadMode: true,
      loadApi: () => [{ id: "future", label: "Future", leaf: true }]
    } });
    const tree = exposed(wrapper);
    tree.setCheckedKeys("future");
    await wrapper.findAll(".utv-tree-item")[1].trigger("click");
    if (clear) {
      tree.setCheckedKeys("future");
      await wrapper.findAll(".utv-tree-item")[1].trigger("click");
    }
    await tree.loadNode(tree.getNode("root")!);
    await nextTick();

    expect(tree.getCheckedKeys()).toEqual(clear ? [] : ["other"]);
    expect(wrapper.emitted("update:modelValue")).toEqual(clear ? [["other"], [null]] : [["other"]]);
    expect(wrapper.emitted("check-change")).toHaveLength(clear ? 2 : 1);
    wrapper.unmount();
  });

  it("preserves the controlled value without a selection event when lazy children are replaced", async () => {
    const wrapper = mount(UniTreeView, { props: {
      data: [{ id: "root", label: "Root", children: [{ id: "child", label: "Old child", leaf: true }] }],
      modelValue: "child",
      loadMode: true,
      alwaysFirstLoad: true,
      loadApi: () => [{ id: "child", label: "Fresh child", leaf: true }]
    } });
    const tree = exposed(wrapper);
    await tree.loadNode(tree.getNode("root")!);
    await nextTick();

    expect(tree.getCheckedKeys()).toEqual(["child"]);
    expect(wrapper.props("modelValue")).toBe("child");
    expect(wrapper.emitted("check-change")).toBeUndefined();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });

  it("emits load-error payloads and keeps failed lazy nodes retryable", async () => {
    const loadError = new Error("lazy load failed");
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "lazy-root", label: "Lazy root", leaf: false }],
        loadMode: true,
        loadApi: () => Promise.reject(loadError)
      }
    });

    await wrapper.find(".utv-tree-item__arrow-icon").trigger("click");
    await flushPromises();

    const payload = wrapper.emitted<TreeLoadErrorPayload[]>("load-error")?.[0]?.[0];
    expect(payload?.node).toMatchObject({
      id: "lazy-root",
      loadError
    });
    expect(payload?.error).toBe(loadError);
    expect(wrapper.find(".utv-tree-item__arrow-icon").classes()).toContain("is-load-error");
  });

  it("combines virtual rendering with lazy loading, retry and scrolling", async () => {
    let attempts = 0;
    const wrapper = mount(UniTreeView, {
      props: {
        data: [
          { id: "lazy-root", label: "Lazy root", leaf: false },
          { id: "static-root", label: "Static root", leaf: true }
        ],
        loadMode: true,
        loadApi: async () => {
          attempts += 1;
          if (attempts === 1) {
            throw new Error("temporary failure");
          }
          return Array.from({ length: 6 }, (_, index) => ({
            id: `lazy-child-${index}`,
            label: `Lazy child ${index}`,
            leaf: true
          }));
        },
        virtual: true,
        virtualHeight: 72,
        virtualItemHeight: 36,
        virtualOverscan: 0
      }
    });

    expect(await exposed(wrapper).scrollToKey("lazy-child-5")).toBe(false);

    await wrapper.find(".utv-tree-item__arrow-icon").trigger("click");
    await flushPromises();
    expect(wrapper.find(".utv-tree-item__arrow-icon").classes()).toContain("is-load-error");

    await wrapper.find(".utv-tree-item__arrow-icon").trigger("click");
    await flushPromises();

    expect(attempts).toBe(2);
    expect(wrapper.emitted("load-error")).toHaveLength(1);
    expect(wrapper.emitted("load")).toHaveLength(1);
    // 两行视口加一行部分可见缓冲；懒加载节点仍参与虚拟窗口。
    expect(wrapper.findAll(".utv-tree-item")).toHaveLength(3);
    expect(wrapper.text()).toContain("Lazy child 0");

    expect(await exposed(wrapper).scrollToKey("lazy-child-5")).toBe(true);
    await nextTick();
    // 定位指令与渲染窗口都应停留在目标节点上。
    expect(wrapper.find("scroll-view").attributes("scroll-top")).toBe("216");
    expect(wrapper.text()).toContain("Lazy child 5");
  });

  it("uses BEM element classes with conventional state classes", () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "disabled", label: "Disabled", disabled: true }],
        multiple: true,
        selectable: true
      }
    });
    const row = wrapper.find(".utv-tree-item");
    const checkbox = row.find(".utv-tree-item__checkbox");

    expect(row.classes()).toEqual(expect.arrayContaining(["is-disabled", "is-leaf"]));
    expect(row.find(".utv-tree-item__arrow-placeholder").exists()).toBe(true);
    expect(checkbox.classes()).toContain("is-disabled");
    expect(row.find(".utv-tree-item__checkbox-icon").exists()).toBe(true);
    expect(wrapper.find(".is--disabled").exists()).toBe(false);
  });

  it("passes node paths to slots and renders all filter matches", () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        defaultExpandAll: true,
        filterValue: "alpha"
      },
      slots: {
        append: ({ node, path }) => `${node.id}:${path.map((item: { label: string }) => item.label).join(">")}`
      }
    });

    expect(wrapper.text()).toContain("child:Alpha root>Alpha child");
    expect(wrapper.findAll(".utv-tree-node-label__match")).toHaveLength(2);
  });

  it("keeps named slots rendered while arrow taps only collapse the node", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: treeData,
        defaultExpandAll: true,
        multiple: true,
        selectable: true,
        checkOnClickNode: true
      },
      slots: {
        icon: ({ node }) => `Icon:${node.id}`,
        label: ({ node }) => `Label:${node.id}`,
        append: ({ node }) => `Append:${node.id}`
      }
    });

    expect(wrapper.text()).toContain("Icon:root");
    expect(wrapper.text()).toContain("Label:child");
    expect(wrapper.text()).toContain("Append:child");

    await wrapper.find(".utv-tree-item__arrow-icon").trigger("click");

    expect(wrapper.findAll(".utv-tree-item")).toHaveLength(1);
    expect(wrapper.text()).toContain("Icon:root");
    expect(wrapper.text()).toContain("Label:root");
    expect(wrapper.text()).toContain("Append:root");
    expect(wrapper.text()).not.toContain("Label:child");
    expect(exposed(wrapper).getCheckedKeys()).toEqual([]);
    expect(wrapper.emitted("expand-change")).toHaveLength(1);
    expect(wrapper.emitted("check-change")).toBeUndefined();
    expect(wrapper.emitted("node-click")).toBeUndefined();
  });

  it("adds nodeClass to rows while preserving the standard root class", () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [
          { id: "first", label: "First" },
          { id: "second", label: "Second" }
        ],
        nodeClass: "consumer-tree-node emphasized"
      },
      attrs: {
        class: "consumer-tree"
      }
    });

    expect(wrapper.classes()).toContain("consumer-tree");
    for (const row of wrapper.findAll(".utv-tree-item")) {
      expect(row.classes()).toEqual(
        expect.arrayContaining(["consumer-tree-node", "emphasized"])
      );
    }
  });

  it("scrolls to a key through scroll-into-view outside virtual mode", async () => {
    const wrapper = mount(UniTreeView, {
      props: { data: treeData }
    });

    expect(await exposed(wrapper).scrollToKey("child")).toBe(true);
    await nextTick();

    const childId = wrapper.findAll(".utv-tree-item")[1].attributes("id");
    expect(wrapper.find("scroll-view").attributes("scroll-into-view")).toBe(childId);
  });

  it("uses stable collision-free DOM ids and scroll commands in virtual mode", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [
          { id: "Aa", label: "First" },
          { id: "BB", label: "Second" }
        ],
        virtual: true,
        virtualHeight: 36,
        virtualItemHeight: 36
      }
    });
    const ids = wrapper.findAll(".utv-tree-item").map((item) => item.attributes("id"));

    expect(new Set(ids).size).toBe(2);

    await wrapper.find("scroll-view").trigger("scroll", { detail: { scrollTop: 36 } });
    expect(wrapper.find("scroll-view").attributes("scroll-top")).toBe("0");

    expect(await exposed(wrapper).scrollToKey("BB")).toBe(true);
    await nextTick();
    expect(wrapper.find("scroll-view").attributes("scroll-top")).toBe("36");
    expect(wrapper.findAll(".utv-tree-item").map((item) => item.attributes("id"))).toEqual(ids);
  });

  it("emits filter results on initial filtering and filtered data replacement", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "root", label: "Root", children: [{ id: "alpha-1", label: "Alpha one" }] }],
        filterValue: "alpha"
      }
    });
    await nextTick();

    expect(wrapper.emitted<TreeFilterPayload[]>("filter-change")?.[0]?.[0]).toMatchObject({
      keys: ["root", "alpha-1"],
      matchedKeys: ["alpha-1"]
    });
    expect(exposed(wrapper).getMatchedKeys()).toEqual(["alpha-1"]);

    await wrapper.setProps({
      data: [{ id: "root", label: "Root", children: [{ id: "alpha-2", label: "Alpha two" }] }]
    });
    await nextTick();

    const events = wrapper.emitted<TreeFilterPayload[]>("filter-change") ?? [];
    expect(events).toHaveLength(2);
    expect(events[1][0]).toMatchObject({
      keys: ["root", "alpha-2"],
      matchedKeys: ["alpha-2"]
    });
    expect(exposed(wrapper).getMatchedNodes().map((node) => node.id)).toEqual(["alpha-2"]);
  });

  it("does not emit filter-change for unfiltered expansion", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "root", label: "Root", children: [{ id: "child", label: "Child" }] }]
      }
    });

    exposed(wrapper).setExpandedKeys(["root"]);
    await nextTick();

    expect(wrapper.emitted("filter-change")).toBeUndefined();
  });

  it("reconciles controlled values when selected keys disappear from non-lazy data", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "selected", label: "Selected" }],
        modelValue: ["selected"],
        multiple: true,
        checkStrictly: true
      }
    });

    await wrapper.setProps({ data: [{ id: "replacement", label: "Replacement" }] });
    await nextTick();

    expect(exposed(wrapper).getCheckedKeys()).toEqual([]);
    expect(wrapper.emitted("update:modelValue")).toEqual([[[]]]);
    expect(wrapper.emitted("check-change")).toBeUndefined();
  });

  it("queues imperative lazy keys and emits after they become selectable", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "lazy-root", label: "Lazy root", leaf: false }],
        multiple: true,
        checkStrictly: true,
        loadMode: true,
        loadApi: () => [{ id: "lazy-child", label: "Lazy child", leaf: true }]
      }
    });
    const tree = exposed(wrapper);

    expect(tree.setCheckedKeys("lazy-child")).toEqual([]);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await tree.loadNode(tree.getNode("lazy-root")!);
    await nextTick();

    expect(tree.getCheckedKeys()).toEqual(["lazy-child"]);
    expect(wrapper.emitted("update:modelValue")).toEqual([[["lazy-child"]]]);
    expect(wrapper.emitted<TreeCheckChangePayload[]>("check-change")?.[0]?.[0].node.id).toBe("lazy-child");
  });

  it("keeps the effective single-select value until an imperative lazy key resolves", async () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [
          { id: "existing", label: "Existing", leaf: true },
          { id: "lazy-root", label: "Lazy root", leaf: false }
        ],
        loadMode: true,
        loadApi: () => [{ id: "lazy-child", label: "Lazy child", leaf: true }]
      }
    });
    const tree = exposed(wrapper);

    expect(tree.setCheckedKeys("existing")).toBe("existing");
    expect(tree.setCheckedKeys("lazy-child")).toBe("existing");
    expect(wrapper.emitted("update:modelValue")).toEqual([["existing"]]);

    await tree.loadNode(tree.getNode("lazy-root")!);
    await nextTick();

    expect(tree.getCheckedKeys()).toEqual(["lazy-child"]);
    expect(wrapper.emitted("update:modelValue")).toEqual([["existing"], ["lazy-child"]]);
  });

  it("returns the effective single-select value and uses the first selectable key", () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [
          { id: "branch", label: "Branch", children: [{ id: "leaf-a", label: "Leaf A" }] },
          { id: "leaf-b", label: "Leaf B" }
        ],
        selectable: true,
        onlyRadioLeaf: true
      }
    });
    const tree = exposed(wrapper);

    expect(tree.setCheckedKeys(["branch", "leaf-a", "leaf-b"])).toBe("leaf-a");
    expect(tree.getCheckedKeys()).toEqual(["leaf-a"]);
  });

  it("highlights repeated literal matches case-insensitively", () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "match", label: "Alpha alpha ALPHA" }],
        filterValue: "aLpHa",
        highlightFilter: true
      }
    });

    expect(wrapper.findAll(".utv-tree-node-label__match").map((item) => item.text())).toEqual([
      "Alpha",
      "alpha",
      "ALPHA"
    ]);
  });

  it("renders paths only for descendants", () => {
    const wrapper = mount(UniTreeView, {
      props: {
        data: [{ id: "root", label: "Root", children: [{ id: "child", label: "Child" }] }],
        defaultExpandAll: true,
        showPath: true,
        pathSeparator: " > "
      }
    });

    expect(wrapper.findAll(".utv-tree-node-path")).toHaveLength(1);
    expect(wrapper.find(".utv-tree-node-path").text()).toBe("Root > Child");
  });

  it("releases DOM ids for removed keys before they are added again", async () => {
    const wrapper = mount(UniTreeView, {
      props: { data: [{ id: "reused", label: "First" }] }
    });
    const firstId = wrapper.find(".utv-tree-item").attributes("id");

    await wrapper.setProps({ data: [{ id: "other", label: "Other" }] });
    await wrapper.setProps({ data: [{ id: "reused", label: "Second" }] });

    expect(wrapper.find(".utv-tree-item").attributes("id")).not.toBe(firstId);
  });
});