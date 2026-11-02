# 快速上手

## 最小示例

```vue
<template>
  <uni-tree-view :data="treeData" />
</template>

<script setup>
import { ref } from "vue";

// 最小结构只需要 id / label / children 三个字段
const treeData = ref([
  {
    id: "product",
    label: "产品研发中心",
    children: [
      { id: "frontend", label: "前端组" },
      { id: "backend", label: "后端组" }
    ]
  },
  { id: "operations", label: "运营中心" }
]);
</script>
```

不传 `selectable` 时是纯展示树，点击箭头展开收起。文档[示例页](/examples/basic)全程使用这套组织架构数据，右侧实时预览与代码一一对应。

## 多选 + v-model

```vue
<template>
  <uni-tree-view
    v-model="checkedValue"
    selectable
    multiple
    :data="treeData"
    @check-change="handleCheckChange"
  />
</template>

<script setup>
import { ref } from "vue";

// key 是节点 id（或 tree-props.id 映射字段的值）
// 多选时 v-model 是 key 数组；这里预选「前端组」（上例中是叶子节点）
const checkedValue = ref(["frontend"]);

// keys 是当前所有已选节点的 key
function handleCheckChange({ keys }) {
  console.log("当前选中:", keys);
}
</script>
```

`selectable` 控制是否启用选择，`multiple` 控制单选/多选：

| 用法 | 行为 |
| --- | --- |
| 不传 `selectable` | 纯展示树，无选择入口 |
| `selectable` | 单选，显示单选按钮 |
| `selectable multiple` | 多选，显示复选框，父子联动 |

## 自定义字段名

后端数据字段不叫 `id` / `label` / `children`？用 `tree-props` 映射：

```vue
<template>
  <uni-tree-view
    :data="treeData"
    :tree-props="{
      id: 'code',
      label: 'name',
      children: 'items',
      disabled: 'readonly'
    }"
  />
</template>

<script setup>
import { ref } from "vue";

// 字段名全部与默认约定不同，靠上面的 tree-props 映射
const treeData = ref([
  {
    code: "product",
    name: "产品研发中心",
    items: [
      { code: "frontend", name: "前端组" },
      { code: "backend", name: "后端组", readonly: true } // readonly 映射为 disabled
    ]
  }
]);
</script>
```

`tree-props` 只声明数据字段名。映射配置发生响应式变化时，组件会重新解析树数据。

## 自定义节点样式

普通 `class` 作用于组件根容器；`node-class` 会添加到每个节点行，因此无需依赖组件内部类名：

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

使用 scoped 样式或小程序端时，仍需遵循对应平台的组件样式隔离规则。

## 搜索过滤

组件不内置搜索框，把任意输入框的值绑到 `filter-value` 即可：

```vue
<template>
  <wd-search v-model="keyword" placeholder="搜索节点" />
  <uni-tree-view
    :data="treeData"
    :filter-value="keyword"
    highlight-filter
  />
</template>

<script setup>
import { ref } from "vue";

const keyword = ref("");
</script>
```

命中节点及其祖先链、全部后代保持可见，`highlight-filter` 开启关键词高亮。

## 下一步

- 完整属性列表 → [Props](/apis/props)
- 懒加载、虚拟渲染 → [示例](/examples/lazy-load)
- 常见问题 → [FAQ](/guide/faq)
