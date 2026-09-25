---
demo: slots
demoTitle: 自定义插槽
outline: false
pageClass: examples-page
---

# 自定义插槽

组件提供 6 个插槽，作用域参数统一为 `{ node, data, path }`（`empty` 和 `empty-filter` 除外）：

| 插槽 | 覆盖范围 |
| --- | --- |
| `icon` | 节点前置图标 |
| `label` | 仅节点文本（缩进、箭头、选择控件仍由组件负责） |
| `append` | 节点尾部内容 |
| `default` | 整个内容区，等于同时接管 icon + label + append |
| `empty` | 无数据或过滤无结果时的空状态（未提供 `empty-filter` 时，过滤无结果也会回退到此插槽） |
| `empty-filter` | 仅在过滤无结果时的空状态 |

本页代码与右侧实时预览共用[基础用法中的示例数据](/examples/basic#示例数据)。

::: tip 示例数据从哪里来？
下方代码中的 `treeData` 就是[基础用法的完整示例数据](/examples/basic#示例数据)：`append` 是组件内置字段，`description`、`isNew` 是演示用业务字段，可通过插槽作用域的 `data` 读取。
:::

## 实时预览对应代码

右侧预览组合了 `icon`、`label`、`append` 三个插槽：部门用 `folder` 图标、成员用 `user` 图标，名字后面按 `isNew` 挂 NEW 徽标，尾部用弱化文本显示 `append` 字段里的人数。

```vue
<template>
  <uni-tree-view
    v-model="checkedValue"
    selectable
    multiple
    default-expand-all
    :data="treeData"
    theme-color="#299764"
  >
    <template #icon="{ node }">
      <wd-icon :name="node.isLeaf ? 'user' : 'folder'" size="16px" color="#299764" />
    </template>

    <template #label="{ node, data }">
      <view class="demo-node-label">
        <!-- node.isLeaf 区分部门与成员，部门加粗 -->
        <text :class="{ 'is-group': !node.isLeaf }">{{ node.label }}</text>
        <!-- isNew 是数据里的业务自定义字段，组件不认识，只在这里用 -->
        <text v-if="data.isNew" class="demo-badge">NEW</text>
      </view>
    </template>

    <template #append="{ data }">
      <text v-if="data.append" class="demo-append">{{ data.append }}</text>
    </template>
  </uni-tree-view>
</template>

<script setup>
import { ref } from "vue";

// 多选下 v-model 为 key 数组
const checkedValue = ref([]);
</script>

<style lang="scss">
.demo-node-label {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
}

.demo-node-label .is-group {
  font-weight: 700;
}

/* NEW 徽标：小面积高饱和，只在成员名字后面点一下 */
.demo-badge {
  padding: 1px 4px;
  color: #b63f3f;
  font-size: 10px;
  font-weight: 750;
  line-height: 14px;
  background: #fff0f0;
  border-radius: 4px;
}

/* 人数文案做弱化处理，不加标签底色，避免抢节点主文案 */
.demo-append {
  color: #87918b;
  font-size: 11px;
  white-space: nowrap;
}
</style>
```

`icon` 换成 `node.isLeaf ? 'file' : 'folder'` 就是文件目录风格；`append` 里想放标签、按钮、数字都可以，只是行高变化时要留意虚拟渲染（见文末警告）。

## 只替换文本

只用 `label` 插槽时，缩进、箭头、选择控件、`show-path` 的路径行都保持原样：

```vue
<uni-tree-view :data="treeData" selectable multiple>
  <template #label="{ node, data }">
    <text :style="{ fontWeight: node.level === 0 ? 600 : 400 }">{{ node.label }}</text>
    <text v-if="data.isNew" style="color: #fa4350; font-size: 10px;">NEW</text>
  </template>
</uni-tree-view>
```

::: warning
自定义 `label` 插槽后会接管内置 `highlight-filter` 关键词高亮（`filter-value` 过滤仍正常生效）。需要同时过滤、高亮和自定义文本时，请在插槽里自行拆分关键词。
:::

## 完全接管节点内容

`default` 插槽替换整个内容区（icon + label + append，同时带走 `show-path` 的路径行与 `highlight-filter` 高亮），缩进、箭头和选择控件仍由组件负责：

```vue
<template>
  <uni-tree-view :data="treeData" selectable multiple default-expand-all>
    <template #default="{ node, data }">
      <view class="custom-node">
        <view class="custom-node__body">
          <text class="custom-node__title">{{ node.label }}</text>
          <!-- description 是数据里的业务自定义字段：成员写岗位，部门没有该字段时不渲染 -->
          <text v-if="data.description" class="custom-node__desc">{{ data.description }}</text>
        </view>
        <text v-if="data.append" class="custom-node__count">{{ data.append }}</text>
      </view>
    </template>
  </uni-tree-view>
</template>

<style lang="scss">
.custom-node {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.custom-node__body {
  flex: 1;
  min-width: 0;
}

.custom-node__desc {
  display: block;
  color: #87918b;
  font-size: 11px;
}

.custom-node__count {
  flex: 0 0 auto;
  color: #87918b;
  font-size: 11px;
}
</style>
```

## 空状态

`empty` 插槽覆盖「没有数据」的情况，也可用作「过滤没命中」的回退（未提供 `empty-filter` 时）。用作用域参数 `filterValue` 区分：

```vue
<uni-tree-view :data="treeData" :filter-value="keyword">
  <template #empty="{ filterValue }">
    <wd-empty :description="filterValue ? '无匹配结果' : '暂无数据'" />
  </template>
</uni-tree-view>
```

若要单独定制过滤无结果的空状态，可使用 `empty-filter` 插槽：

```vue
<uni-tree-view :data="treeData" :filter-value="keyword">
  <template #empty-filter="{ filterValue }">
    <wd-empty description="无匹配结果" />
  </template>
  <template #empty>
    <wd-empty description="暂无数据" />
  </template>
</uni-tree-view>
```

::: warning 与虚拟渲染同用
自定义内容改变了行高时，若同时开启 `virtual`，必须把 `virtual-item-height` 调到与实际行高一致，并保证所有行等高——虚拟模式按该值固定行高，超出部分会被裁掉。
:::
