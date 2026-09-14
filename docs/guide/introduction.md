# 介绍

`uni-tree-view` 是一个基于 **uni-app + Vue 3** 的跨端树形列表/选择组件。

一套代码同时运行在：

- 微信小程序
- 支付宝小程序
- H5

::: tip 文档站入口
文档站双线部署，内容原则上保持一致：主入口 [GitHub Pages](https://keryin-dev.github.io/uni-tree-view/)；访问较慢时可切换到 [Netlify 镜像](https://uni-tree-view.netlify.app/)。
:::

## 特性

- 🌲 展开收起、单选/多选、父子联动、`check-strictly` 严格模式
- 🔍 关键词过滤、自定义 `filter-method`、命中高亮
- ⚡ `virtual` 虚拟渲染，只渲染可视区域，适合大数据树
- 🔌 `load-api` 懒加载，内置加载中、加载失败与重试状态
- 🎨 `theme-color`、`node-class` 与插槽自由定制节点外观和内容
- 📦 零运行时依赖，npm 与 DCloud 插件市场双通道分发

## 它不做什么

为了保持小程序端的体积和性能，本组件**刻意不内置**以下能力，请组合你项目中已有的组件库（如 [wot-ui](https://wot-ui.cn)）实现：

| 能力 | 建议做法 |
| --- | --- |
| 搜索输入框 | 用 `wd-search` 等组件绑定 `filter-value` |
| 弹窗选择器 | 用 `wd-popup` / `wd-action-sheet` 包裹本组件 |
| 拖拽排序 | 超出移动端树组件的常见场景，暂无计划 |

## 兼容性

| 平台 | 支持情况 |
| --- | --- |
| H5 | ✅ 构建 + 交互验证 |
| 微信小程序 | ✅ 构建验证 |
| 支付宝小程序 | ✅ 构建验证 |
| App（不含 nvue） | 理论可用，未充分验证 |

详见[平台兼容性](/guide/platforms)。
