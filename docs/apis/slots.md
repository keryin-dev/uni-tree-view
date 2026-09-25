# Slots

| 插槽 | 作用域参数 | 说明 |
| --- | --- | --- |
| `default` | `{ node, data, path }` | 整个节点内容区（替换 icon + label + append，`show-path` 的路径行与 `highlight-filter` 高亮也随之失效） |
| `label` | `{ node, data, path }` | 仅节点文本；接管后内置 `highlight-filter` 高亮不再渲染，需自行实现（过滤仍生效） |
| `icon` | `{ node, data, path }` | 节点前置图标 |
| `append` | `{ node, data, path }` | 节点尾部附加内容 |
| `empty` | `{ filterValue }` | 普通空数据，以及未提供 `empty-filter` 时过滤无结果的内容 |
| `empty-filter` | `{ filterValue }` | 过滤关键词非空且无匹配节点时的专用空状态；未提供时回退到 `empty` |

插槽参数说明：

- `node: TreeNode`：组件内部节点对象，包含 `level`、`checked`、`expanded` 等状态
- `data: TreeDataItem`：传入组件的原始数据项
- `path: TreeNode[]`：从根节点到当前节点的路径

## 示例

### 自定义 label 与尾部内容

```vue
<uni-tree-view :data="treeData" selectable multiple>
  <template #label="{ node }">
    <!-- node.level 为层级，根节点是 0 -->
    <text :style="node.level === 0 ? 'font-weight:600' : ''">
      {{ node.label }}
    </text>
  </template>
  <template #append="{ data }">
    <!-- data 是你传入的原始数据项，可读任意业务字段 -->
    <text v-if="data.append" style="color:#87918b; font-size:11px;">
      {{ data.append }}
    </text>
  </template>
</uni-tree-view>
```

::: warning 自定义文本与过滤高亮
`label` 插槽会接管内置 label，`default` 插槽会接管整个内容区，因此两者都会接管内置关键词高亮。`filter-value` 仍会正常过滤；如需高亮，请在插槽中根据关键词自行拆分文本。
:::

完整可运行写法见[自定义插槽示例](/examples/slots#实时预览对应代码)。

### 自定义空状态

```vue
<uni-tree-view :data="treeData" :filter-value="keyword">
  <template #empty="{ filterValue }">
    <wd-empty
      :description="filterValue ? `没有匹配 “${filterValue}” 的节点` : '暂无数据'"
    />
  </template>
</uni-tree-view>
```

如果普通空数据和过滤无结果需要展示不同内容，可以使用 `empty-filter`：

```vue
<uni-tree-view :data="treeData" :filter-value="keyword">
  <template #empty>
    <text>暂无数据</text>
  </template>
  <template #empty-filter="{ filterValue }">
    <text>没有匹配「{{ filterValue }}」的节点</text>
  </template>
</uni-tree-view>
```

::: warning 虚拟渲染注意
使用 `default` 插槽大幅改变节点结构时，若开启 `virtual`，请保证行高固定并与 `virtual-item-height` 一致。
:::
