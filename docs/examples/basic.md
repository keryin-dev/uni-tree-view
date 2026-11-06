---
demo: basic
demoTitle: 基础用法
outline: false
pageClass: examples-page
---

# 基础用法

## 示例数据

示例页的全部代码片段与右侧实时预览共用下面这一份 `treeData`（代码直接引自预览的源文件，不会与预览脱节）：

<<< ../../playground/src/components/docs-demos/data.ts#tree-data

组件只识别其中几个字段，其余都是业务自定义字段：

| 字段 | 归属 | 说明 |
| --- | --- | --- |
| `id` / `label` / `children` | 组件内置 | 节点标识、文本、子节点，字段名可用 `tree-props` 改 |
| `disabled` | 组件内置 | 节点置灰，且默认锁定当前选中状态 |
| `append` | 组件内置 | 渲染在节点右侧的附加文本 |
| `description` / `isNew` | 业务自定义 | 组件不认识，只在插槽里通过 `data` 取用 |

## 纯展示树

不传 `selectable` 时为纯展示树，点击箭头展开收起：

```vue
<template>
  <uni-tree-view :data="treeData" />
</template>

<script setup>
import { ref } from "vue";

// 展示树只需要 id / label / children 三个字段
const treeData = ref([
  {
    id: "product",
    label: "产品研发中心",
    children: [
      {
        id: "frontend",
        label: "前端组",
        children: [
          { id: "frontend-1", label: "林小满" },
          { id: "frontend-2", label: "周一帆" }
        ]
      },
      { id: "backend", label: "后端组" }
    ]
  },
  { id: "operations", label: "运营中心" }
]);
</script>
```

## 默认展开

```vue
<!-- 展开全部 -->
<uni-tree-view :data="treeData" default-expand-all />

<!-- 只展开指定节点：右侧实时预览用的就是这一行 -->
<uni-tree-view :data="treeData" :default-expanded-keys="['frontend']" />
```

`default-expanded-keys` 用于设置默认展开节点。指定后代节点时，组件默认也会展开它的所有祖先；如不需要，可设置 `:default-expand-parent="false"`。

之后如果修改 `default-expanded-keys`，组件会按新值重新设置整棵树的展开状态，覆盖用户手动展开或收起的结果。需要在运行时只改变部分节点时，请使用 [`setExpandedKeys`](/apis/methods#展开)。

开启 `cache-expanded-keys` 后，替换 `data` 会保留同 key 节点的展开和收起状态，包括用户收起的默认展开节点；节点暂时从 `data` 移除后再次出现，也会恢复缓存；从未出现的新节点使用默认展开配置。显式修改默认展开配置会重设状态，关闭缓存会清除旧缓存。

## 禁用节点

数据中 `disabled: true` 的节点会置灰。`checked-disabled` 默认为 `false`，因此用户点击、全选、清空、父子联动、实例方法和外部更新 `v-model`，都不会改变它的选中状态。示例数据里的「顾宁」就是这样：

```js
{ id: "backend-2", label: "顾宁", disabled: true }
```

如果禁用的是父节点，父节点仍可在非严格多选中汇总子节点状态：子节点可正常选择，部分选中时父节点半选，全部选中时父节点全选，但父节点自身不可直接操作。`:pack-disabled-key="false"` 只会把这个已选禁用父节点从返回结果中排除，不改变其视觉状态。

如果业务需要直接改变禁用节点的选中状态，可显式开启 `checked-disabled`。字段名不叫 `disabled` 时用 `tree-props` 映射：

```vue
<uni-tree-view :data="treeData" :tree-props="{ disabled: 'readonly' }" />
```

## 整行交互

`expand-on-click-node` 不是基础用法的必需项：组件默认只响应箭头，前面的纯展示树和默认展开示例都无需传入。移动端希望扩大触控区域、让节点文字也能触发展开时，再按需开启：

```vue
<uni-tree-view
  :data="treeData"
  expand-on-click-node
/>
```

| 属性 | 作用 |
| --- | --- |
| `expand-on-click-node` | 点击节点行任意位置展开/收起 |
| `check-on-click-node` | 点击节点行任意位置切换选中（需配合 `selectable`） |
| `check-on-click-leaf` | 仅点击叶子节点行时切换选中（需配合 `selectable`）；适合保留父节点行的展开/导航语义 |

右侧实时预览顶部仍保留「整行展开 / 箭头展开」按钮用于对比两种交互，初始状态为「箭头展开」；`check-on-click-node` 的效果见[单选与多选](/examples/selection)。如果只希望点击叶子节点选中，可改用：

```vue
<uni-tree-view
  :data="treeData"
  selectable
  multiple
  check-on-click-leaf
/>
```

需要同级节点保持手风琴式展开时，可额外开启 `accordion`：

```vue
<uni-tree-view
  :data="treeData"
  expand-on-click-node
  accordion
/>
```

`accordion` 只在用户展开节点时收起同级已展开节点，默认展开属性仍按显式配置应用。

## 节点路径

打开 `show-path` 后，非根节点文本下方会补一行从根节点到当前节点的完整层级路径，根节点不会重复显示自身；`path-separator` 定义分隔符：

```vue
<uni-tree-view :data="treeData" show-path path-separator=" / " />
```

「林小满」显示的路径即 `产品研发中心 / 前端组 / 林小满`。右侧预览的「显示路径」按钮切换的就是这个属性。

## 监听节点点击

```vue
<template>
  <uni-tree-view :data="treeData" @node-click="onNodeClick" />
</template>

<script setup>
function onNodeClick({ node, path }) {
  // node 为组件内部节点对象，path 是根到该节点的节点链（含自身）
  console.log(node.label, path.map(item => item.label).join(" / "));
}
</script>
```

## 自定义节点样式

普通 `class` 设置组件根容器；`node-class` 设置每个节点行的外部类名：

```vue
<template>
  <uni-tree-view
    class="department-tree"
    node-class="department-tree-node"
    :data="treeData"
  />
</template>

<style scoped>
:deep(.department-tree-node) {
  min-height: 44px;
}
</style>
```

`node-class` 是外部样式入口，不需要依赖组件内部类名。只想换主色时用 `theme-color` 更省事（预览用的是 `#299764`）：

```vue
<uni-tree-view :data="treeData" selectable multiple theme-color="#299764" />
```
