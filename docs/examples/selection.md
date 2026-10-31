---
demo: selection
demoTitle: 单选与多选
outline: false
pageClass: examples-page
---

# 单选与多选

本页代码与右侧实时预览共用[基础用法中的示例数据](/examples/basic#示例数据)（产品研发中心 / 运营中心两棵子树），下文的 `treeData` 均指这份数据。

## 单选

`selectable` 不加 `multiple` 即为单选，`v-model` 为一个 key（未选中时为 `null`）。key 默认是节点的 `id`，也可以通过 `tree-props.id` 映射到其他字段：

```vue
<template>
  <uni-tree-view
    v-model="selected"
    selectable
    check-on-click-node
    default-expand-all
    :data="treeData"
  />
</template>

<script setup>
import { ref } from "vue";

// 初始选中「前端组」；单选下 v-model 是单个 key，不是数组
const selected = ref("frontend");
</script>
```

## 叶子单选

在单选基础上增加 `only-radio-leaf`，即可限制为只选择叶子节点。此时点击「前端组」这类父节点不会改变选中值，只有「林小满」「周一帆」这类叶子节点可以被选中：

```vue
<template>
  <uni-tree-view
    v-model="selectedLeaf"
    selectable
    only-radio-leaf
    check-on-click-node
    default-expand-all
    :data="treeData"
  />
</template>

<script setup>
import { ref } from "vue";

// 初始选中叶子节点「林小满」
const selectedLeaf = ref("frontend-1");
</script>
```

::: tip
`only-radio-leaf` **仅在单选模式生效**，不会改变节点原有的展开、收起行为；开启 `multiple` 后该属性会被忽略。
:::

## 多选（父子联动）

`multiple` 开启多选，`v-model` 为 key 数组。勾选父节点自动勾选全部子节点，部分勾选时父节点为半选：

```vue
<template>
  <uni-tree-view
    v-model="checked"
    selectable
    multiple
    check-on-click-node
    default-expand-all
    :data="treeData"
    @check-change="onChange"
  />
</template>

<script setup>
import { ref } from "vue";

// 多选下 v-model 必须是数组；这里预选「沈青」，其父节点「设计组」会自动变半选
const checked = ref(["design-1"]);

function onChange({ keys, node }) {
  console.log(`${node.label} 变化后共选中 ${keys.length} 项`);
}
</script>
```

被 `disabled` 标记的「顾宁」不会因为父节点联动而被选中。

禁用父节点的行为是“只读汇总”：父节点本身不能直接操作，但未禁用的子节点仍可选择；选择部分子节点时父节点显示半选，全部子节点选中时父节点显示全选。若不希望这个已选禁用父节点进入返回结果，可设置 `:pack-disabled-key="false"`，其视觉汇总状态不会因此改变。严格模式下父子状态互相独立，不产生该汇总。

## 严格模式（父子独立）

`check-strictly` 下父子互不影响，勾选「后端组」不会连带勾选组内成员：

```vue
<template>
  <uni-tree-view
    v-model="checked"
    selectable
    multiple
    check-strictly
    check-on-click-node
    :data="treeData"
  />
</template>

<script setup>
import { ref } from "vue";

// 严格模式下父节点可以单独被选中，不产生半选状态
const checked = ref(["backend"]);
</script>
```

## 通过方法操作选中

右侧实时预览在「父子联动 / 严格模式」下会出现「选中设计组」「清空选中」两个按钮，调用的就是下面两个方法：

```vue
<template>
  <button @click="checkDesignTeam">选中设计组</button>
  <button @click="clearChecked">清空选中</button>
  <text>当前选中：{{ checked.join(", ") || "无" }}</text>

  <uni-tree-view
    ref="treeRef"
    v-model="checked"
    selectable
    multiple
    default-expand-all
    :data="treeData"
  />
</template>

<script setup>
import { ref } from "vue";

const treeRef = ref();
// 用于 v-model，并在模板中实时展示实例方法执行后的选中 keys
const checked = ref([]);

function checkDesignTeam() {
  // 传入「设计组」的 key；父子联动模式下组内成员会一起被选中
  treeRef.value.setCheckedKeys("design", true);
}

function clearChecked() {
  // 只清空可操作节点，禁用节点保持原状态
  const selectableKeys = treeRef.value
    .getCheckedNodes()
    .filter((node) => !node.disabled)
    .map((node) => node.id);

  treeRef.value.setCheckedKeys(selectableKeys, false);
}
</script>
```

::: tip
`checked-disabled` 默认为 `false`，禁用节点的选中状态会被锁定；全选、清空、父子联动和外部更新 `v-model`，都不会直接改变它。需要允许禁用节点改变选中状态时，显式开启 `checked-disabled`。

`pack-disabled-key` 只控制已选禁用节点是否进入 `v-model`、事件和查询方法的返回结果，不会清除内部/视觉选中状态。

`setCheckedKeys` 返回当前实际生效的选中值。已存在且可选的节点发生变化时，它会同步更新 `v-model` 并触发一次 `check-change`；单选传入数组时只使用第一个可选 key。懒加载中尚未出现的 key 会进入等待队列，方法先返回当前值，节点加载成功后再补选并触发事件。全部已知 key 都被禁用规则拦截时状态不变，也不会触发事件。完整方法列表见 [Methods](/apis/methods)。
:::
