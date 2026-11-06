---
demo: lazy-load
demoTitle: 懒加载
outline: false
pageClass: examples-page
---

# 懒加载

节点子级按需加载，适合层级深、数据量大的异步数据源（如组织架构、地区选择）。

::: warning 启用条件与失败重试
懒加载必须同时提供 `load-mode` 和 `load-api`。只传 `load-api`、只监听 `load/load-error`，或只写 `is-leaf-fn` 都不会启用懒加载。加载失败后可再次点击节点箭头，或通过 ref 调用 `retryLoad` 重试。
:::

本页示例是一棵「区域 → 城市」两级地区树，与右侧实时预览用的是同一份数据：根节点只有三个区域，城市在展开时才请求。

## 实时预览对应代码

```vue
<template>
  <uni-tree-view
    load-mode
    selectable
    only-radio-leaf
    check-on-click-node
    :data="rootData"
    :load-api="loadChildren"
    :is-leaf-fn="isCityLeaf"
    theme-color="#299764"
    @load="onLoad"
    @load-error="onLoadError"
  />
</template>

<script setup>
import UniTreeView from "uni-tree-view";

function isCityLeaf(item) {
  return item.type === "city";
}

// 首屏只给根节点：type 用来区分「可继续展开的区域」和「已经是叶子的城市」
const rootData = [
  { id: "north", label: "华北区域", append: "2 城市", type: "region" },
  { id: "east", label: "华东区域", append: "3 城市", type: "region" },
  { id: "south", label: "华南区域", append: "2 城市", type: "region" }
];

// 真实项目里这一段是接口返回；预览用本地映射模拟
const childrenMap = {
  north: [
    { id: "beijing", label: "北京", type: "city" },
    { id: "tianjin", label: "天津", type: "city" }
  ],
  east: [
    { id: "shanghai", label: "上海", type: "city" },
    { id: "hangzhou", label: "杭州", type: "city" },
    { id: "suzhou", label: "苏州", type: "city" }
  ],
  south: [
    { id: "guangzhou", label: "广州", type: "city" },
    { id: "shenzhen", label: "深圳", type: "city" }
  ]
};

// load-api 收到的是组件内部节点对象，返回子节点数组即可，挂载由组件负责
async function loadChildren(node) {
  await new Promise(resolve => setTimeout(resolve, 650));
  return childrenMap[String(node.id)] ?? [];
}

function onLoad({ node, children }) {
  console.log(`${node.label} 加载了 ${children.length} 个子节点`);
}

function onLoadError({ node }) {
  uni.showToast({ title: `${node.label} 加载失败`, icon: "none" });
}
</script>
```

换成真实接口时只替换 `loadChildren` 的实现：

```js
async function loadChildren(node) {
  const res = await uni.request({
    url: "/api/areas",
    data: { parentId: node.id }
  });
  return res.data.list;
}
```

## 判断叶子节点

`load-mode` 下所有节点默认视为可展开，展开时调用 `load-api`；返回空数组的节点自动变为叶子。想在请求前就知道谁是叶子，有两种方式：

```vue
<!-- 方式一：数据里带 leaf 字段，组件自动识别 -->
<uni-tree-view load-mode :data="rootData" :load-api="loadChildren" />

<!-- 方式二：字段名不同或需要按逻辑判断，用 is-leaf-fn -->
<uni-tree-view
  load-mode
  :data="rootData"
  :load-api="loadChildren"
  :is-leaf-fn="isCityLeaf"
/>
```

上面的 `isCityLeaf` 与完整示例使用同一函数，也可以写成内联函数。叶子规则在解析 `data` 或创建懒加载节点时使用；仅替换函数引用或修改其闭包内的数据不会重建已有节点，因此父组件重新渲染不会清空已加载子节点或使在途请求失效。如需重新计算已有节点，请替换 `data` 根引用；这会按新数据重建状态树，旧树的在途加载结果将被忽略。

`is-leaf-fn` 的第一个参数是原始数据项，第二个参数是组件内部节点对象：`(item, node) => boolean`。右侧预览就是用它把 `type` 为 `city` 的节点识别为叶子，所以城市前面没有展开箭头。

配合 `only-radio-leaf` 可以做出「只能选到城市」的地区选择器，这也是预览里的效果。

## 失败重试

加载失败的节点会停在失败态。再次点击该节点箭头，或通过 ref 调用 `retryLoad` 都会重新请求。预览里打开「模拟首次失败」后即可体验：

```vue
<template>
  <uni-tree-view
    ref="treeRef"
    load-mode
    :data="rootData"
    :load-api="loadChildren"
    @load-error="onError"
  />
</template>

<script setup>
import { ref } from "vue";

const treeRef = ref();

function onError({ node }) {
  uni.showModal({
    title: "加载失败",
    content: `重新加载 ${node.label}？`,
    success: ({ confirm }) => {
      if (confirm) {
        // 传 key 或节点对象都可以；返回 Promise，加载失败时会抛出错误
        treeRef.value.retryLoad(node.id);
      }
    }
  });
}
</script>
```

节点的失败状态可以从 `node.loadError` 读到（未失败或重试成功后为 `null`），配合 `default` 插槽能自定义失败态样式。

## 带静态 children 也强制走一次加载

节点在数据里自带静态 `children` 时，默认会被视为已加载，展开不会调用 `load-api`。这里的“已加载”只表示不再请求，**不代表默认展开**；初始展开仍由 `default-expand-all`、`default-expanded-keys` 等展开属性控制。

开启 `always-first-load` 后，这类节点首次展开时也会强制调用一次 `load-api`（加载成功后同样不再重复请求）：

```vue
<uni-tree-view load-mode always-first-load :data="rootData" :load-api="loadChildren" />
```

异步结果会替换原有子树。新旧节点使用相同 key 且仍满足选择规则时，会恢复受控值指定的选择；未绑定 `v-model` 时保留当前运行时选择，不会重新应用已经取消的默认选择。若受控 key 对应的后代暂时被移除，它仍会等待后续加载；期间更新或清空 `v-model` 会取代旧的等待选择。

## 与虚拟渲染组合

懒加载可以和 `virtual` 同时使用：加载成功后新增节点会进入可见列表，虚拟窗口随之重新计算。组合示例、失败重试和共用加载函数见[虚拟渲染：与懒加载组合](/examples/virtual#与懒加载组合)。

::: warning
懒加载模式下，`setExpandedKeys`、`expandAll`、`collapseAll` 只处理已经进入状态树的节点，不会为了展开而自动触发请求；`scrollToKey` 同理，目标节点尚未加载出来时返回 `false`。
:::
