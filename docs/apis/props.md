# Props

本文中的 key 指节点的唯一标识：默认是 `id`，也可以通过 `tree-props.id` 映射到其他字段。

## 数据

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `data` | `TreeDataItem[]` | `[]` | 树形数据 |
| `v-model` / `modelValue` | `TreeKey \| TreeKey[] \| null` | - | 选中值。单选为一个 key 或 `null`，多选为 key 数组 |
| `tree-props` | `Partial<TreeProps>` | - | 字段映射，见下方 [TreeProps](#treeprops) |
| `default-checked-keys` | `TreeKey \| TreeKey[] \| null` | `[]` | 未绑定 `v-model` 时的初始选中 key |

### TreeProps

```ts
interface TreeProps {
  id: string;        // 默认 "id"
  label: string;     // 默认 "label"
  children: string;  // 默认 "children"
  disabled?: string; // 默认 "disabled"
  leaf?: string;     // 默认 "leaf"
  append?: string;   // 默认 "append"
  icon?: string;     // 默认 "icon"
}
```


## 选择

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `selectable` | `boolean` | `false` | 是否启用并展示选择控件 |
| `multiple` | `boolean` | `false` | 是否多选。`false` 时为单选 |
| `show-radio-icon` | `boolean` | `true` | 单选模式是否显示单选按钮；关闭时需开启 `check-on-click-node` 或 `check-on-click-leaf`，否则用户没有选择入口 |
| `check-strictly` | `boolean` | `false` | 父子选中状态是否互相独立 |
| `only-radio-leaf` | `boolean` | `false` | 仅单选模式生效，限制为只允许选择叶子节点；`multiple=true` 时忽略 |
| `check-on-click-node` | `boolean` | `false` | 点击任意节点行是否切换选中；开启后同时覆盖叶子和非叶子节点 |
| `check-on-click-leaf` | `boolean` | `false` | 是否仅允许通过点击叶子节点行切换选中；可与 `check-on-click-node` 同时开启，后者优先覆盖全部节点 |
| `checked-disabled` | `boolean` | `false` | 禁用节点是否允许改变选中状态；关闭时，全选、清空、父子联动和外部更新 `v-model` 都不会改变它 |
| `pack-disabled-key` | `boolean` | `true` | `v-model`、选择事件和查询方法的返回结果中，是否包含已选中的禁用节点；不改变节点内部或界面上的选中状态 |

## 展开

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `default-expand-all` | `boolean` | `false` | 初始是否展开全部 |
| `default-expanded-keys` | `TreeKey[]` | `[]` | 初始展开的 keys；指定任意层级节点时，其所有祖先也会展开 |
| `default-expand-parent` | `boolean` | `true` | 是否自动展开 `default-expanded-keys` 中节点的所有祖先；设为 `false` 时仅展开指定节点 |
| `expand-checked` | `boolean` | `false` | 初始是否展开已选节点的祖先链 |
| `expand-on-click-node` | `boolean` | `false` | 点击整行是否展开/收起 |
| `accordion` | `boolean` | `false` | 展开一个节点时是否自动收起同级已展开节点；只影响运行时展开操作，不改变默认展开配置的语义 |
| `cache-expanded-keys` | `boolean` | `false` | 数据重建时保留运行时展开状态 |

## 过滤

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `filter-value` | `string` | `""` | 过滤关键词，命中节点及其祖先链、后代节点保持可见 |
| `filter-method` | `(value, node) => boolean` | - | 自定义匹配函数 |
| `highlight-filter` | `boolean` | `true` | 仅在内置 label 中高亮关键词；使用 `label` 或 `default` 插槽后需自行实现高亮，但过滤仍正常生效 |

## 懒加载

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `load-mode` | `boolean` | `false` | 开启懒加载模式，需配合 `load-api`；仅提供加载函数或仅监听事件不会启用懒加载 |
| `load-api` | `(node) => TreeDataItem[] \| Promise<...>` | - | 子节点加载函数，只有 `load-mode=true` 时才会在展开节点时调用 |
| `is-leaf-fn` | `(item, node) => boolean` | - | 自定义叶子节点判断 |
| `always-first-load` | `boolean` | `false` | 首次展开时即使已有静态 children 也执行加载 |

## 外观

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `theme-color` | `string` | `#007aff` | 主题色（选中控件、高亮） |
| `node-class` | `string` | `""` | 添加到每个节点行的自定义 class，不必依赖组件内部类名 |
| `indent` | `number` | `20` | 每级缩进，单位 **px**，不随屏幕宽度缩放 |
| `selection-placement` | `"left" \| "right"` | `"left"` | 单选按钮或复选框的位置 |
| `empty-text` | `string` | `暂无数据` | 空数据文案 |
| `show-path` | `boolean` | `false` | 非根节点的 label 下方展示完整路径；根节点不重复显示路径行 |
| `path-separator` | `string` | `" / "` | 路径分隔符 |

普通 `class` 仍按 Vue / uni-app 约定作用于组件根容器；需要定制节点行时使用 `node-class`：

```vue
<uni-tree-view
  class="department-tree"
  node-class="department-tree-node"
  :data="data"
/>

<style scoped>
:deep(.department-tree-node) {
  min-height: 44px;
}
</style>
```

使用 scoped 样式或小程序端时，仍需遵循对应平台的组件样式隔离规则。

## 虚拟渲染

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `virtual` | `boolean` | `false` | 开启定高虚拟渲染 |
| `virtual-height` | `number` | `400` | 虚拟滚动视口高度，只接受数值，单位固定为 **px**；不支持 `rpx`、`%`、`vh`、`calc()` |
| `virtual-item-height` | `number` | `36` | 行高，单位 **px**；虚拟模式会据此固定内置节点行高 |
| `virtual-overscan` | `number` | `8` | 可视区上下额外渲染的行数 |

`virtual-height` 和 `virtual-item-height` 会直接参与可视窗口计算，因此当前必须提供像素数值。节点较少、内容不足 `virtual-height` 时，组件会渲染全部节点，但仍保留固定高度视口，剩余区域留空；需要内容高度自适应时不要开启 `virtual`。
