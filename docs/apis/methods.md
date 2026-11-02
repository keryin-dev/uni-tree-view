# Methods

先给组件设置 `ref`，再通过组件实例调用方法。本文中的 key 指节点的 `id`，或 `tree-props.id` 映射字段的值。

```vue
<template>
  <uni-tree-view ref="treeRef" :data="treeData" selectable multiple />
</template>

<script setup>
import { ref } from "vue";

const treeRef = ref();

function selectAll() {
  const selectableKeys = treeRef.value
    .getVisibleNodes()
    .filter((node) => !node.disabled)
    .map((node) => node.id);

  treeRef.value.setCheckedKeys(selectableKeys, true);
}
</script>
```

## 选中

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `setCheckedKeys` | `(keys: TreeKey \| TreeKey[], checked = true) => TreeModelValue` | 设置指定 keys 的选中状态，并返回当前实际生效的选中值；默认跳过禁用节点 |
| `getCheckedKeys` | `() => TreeKey[]` | 获取全部选中 keys |
| `getHalfCheckedKeys` | `() => TreeKey[]` | 获取半选 keys |
| `getUncheckedKeys` | `() => TreeKey[]` | 获取未选 keys |
| `getCheckedNodes` | `() => TreeNode[]` | 获取全部选中节点 |
| `getHalfCheckedNodes` | `() => TreeNode[]` | 获取半选节点 |
| `getUncheckedNodes` | `() => TreeNode[]` | 获取未选节点 |

`setCheckedKeys` 的返回值与当前模式一致：单选返回实际选中的 key 或 `null`，多选返回实际选中的 key 数组。单选传入数组时按顺序使用第一个可选 key；因此调用方不需要猜测禁用节点、`only-radio-leaf` 等规则过滤后的结果。

懒加载模式下，尚未进入状态树的 key 会排队等待。方法先返回当前实际生效值；对应节点加载成功且可选后，组件再应用选中状态，并触发 `update:modelValue` 与 `check-change`。已经存在但受禁用规则拦截的节点不会进入等待队列。

单选模式中，新的用户选择或取消选择会取消之前尚未落地的等待选择，后续加载不会覆盖用户的最新操作。

`checked-disabled` 默认为 `false`，此时禁用节点的当前选中状态会被锁定：通过 `setCheckedKeys` 实现的全选、清空，以及父子联动和外部更新 `v-model`，都不会直接改变它。只有显式开启 `checked-disabled`，禁用节点才允许改变选中状态。

`pack-disabled-key=false` 会把已选禁用节点从 `getCheckedKeys/getCheckedNodes`、`check-change` 和 `v-model` 中排除，但不会取消其内部/视觉选中状态。禁用父节点仍可能因子节点全部选中而显示为全选。

非严格多选中的禁用父节点会继续汇总子节点状态。外部清空或替换 `v-model` 后，它的全选/半选状态也会重新计算；禁用叶节点仍遵循选中状态锁定规则。

## 展开

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `setExpandedKeys` | `(keys: TreeKey[] \| "all", expanded = true) => void` | 设置展开状态，`"all"` 作用于全部 |
| `expandAll` | `() => void` | 展开全部 |
| `collapseAll` | `() => void` | 收起全部 |
| `getExpandedKeys` | `() => TreeKey[]` | 获取已展开 keys |
| `getUnexpandedKeys` | `() => TreeKey[]` | 获取未展开 keys |
| `getExpandedNodes` | `() => TreeNode[]` | 获取已展开节点 |
| `getUnexpandedNodes` | `() => TreeNode[]` | 获取未展开节点 |

> 懒加载模式下，`setExpandedKeys`、`expandAll` 和 `collapseAll` 只处理当前已经进入状态树的节点，不会自动调用 `load-api` 加载未知后代。需要加载时请先调用 `loadNode` / `retryLoad`，或由用户展开节点触发加载。

## 查询

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `getNode` | `(key: TreeKey) => TreeNode \| undefined` | 按 key 查找节点 |
| `getNodePath` | `(keyOrNode) => TreeNode[]` | 获取根到节点的路径 |
| `getVisibleKeys` | `() => TreeKey[]` | 当前可见（含过滤后）keys |
| `getVisibleNodes` | `() => TreeNode[]` | 当前可见节点 |
| `getMatchedKeys` | `() => TreeKey[]` | 当前过滤条件下直接命中的 keys；未过滤时为空数组 |
| `getMatchedNodes` | `() => TreeNode[]` | 当前过滤条件下直接命中的节点；未过滤时为空数组 |

## 懒加载 / 滚动

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `loadNode` | `(node: TreeNode) => Promise<TreeDataItem[]>` | 手动触发节点加载 |
| `retryLoad` | `(keyOrNode) => Promise<TreeDataItem[]>` | 重试加载失败的节点 |
| `scrollToKey` | `(key, options?: { expandParents? }) => Promise<boolean>` | 滚动到指定节点（虚拟与普通模式均可用），`expandParents` 默认 `true`，先展开已加载的祖先链后定位 |

同一节点加载期间，`loadNode` 和 `retryLoad` 的并发调用共享同一个在途 Promise，并取得相同的子节点数组或失败结果；一次实际请求只触发一次 `load` 或 `load-error`。失败后可再次调用重试。传入已从当前树移除的旧节点不会发起请求。

`scrollToKey` 只能定位当前已经进入状态树的节点；目标 key 尚未通过懒加载创建时返回 `false`，且不会为了查找目标而自动加载后代。目标被筛选隐藏，或设置 `expandParents: false` 后仍不可见时，也返回 `false`。

返回 `true` 表示已提交定位指令，不表示原生滚动已经停稳。虚拟模式下，若请求在提交前被更新的定位/范围校正指令取代，或因关闭虚拟模式、组件卸载而取消，会返回 `false`。调用方不应把所有 `false` 都解释为“节点不存在”。
