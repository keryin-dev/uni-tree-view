---
layout: home

hero:
  name: Uni Tree View
  text: 跨端树形列表/选择组件
  tagline: 基于 uni-app + Vue 3，一套代码运行在微信小程序、支付宝小程序和 H5
  image:
    src: /logo.svg
    alt: uni-tree-view Logo
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/quick-start
    - theme: alt
      text: 在线演示
      link: /ui/index.html
      target: _self
    - theme: alt
      text: API 参考
      link: /apis/props
    - theme: alt
      text: GitHub
      link: https://github.com/keryin-dev/uni-tree-view

features:
  - icon: 🌲
    title: 完整的树形能力
    details: 展开收起、单选/多选、父子联动、严格模式、禁用节点、默认展开/选中，覆盖常见业务场景。
  - icon: 🔍
    title: 搜索过滤与高亮
    details: 内置关键词过滤、自定义匹配函数和命中高亮，配合任意搜索框组件即可使用。
  - icon: ⚡
    title: 虚拟渲染
    details: 开启 virtual 后只渲染可视区域，减少实际渲染的节点行数，适合大数据树。
  - icon: 🔌
    title: 懒加载
    details: 通过 `load-api` 按需加载子节点，内置加载中、加载失败与重试状态，适配异步数据源。
  - icon: 🎨
    title: 轻量可定制
    details: 零运行时依赖，可通过 `theme-color` 调整主题色，并用文本、图标、尾部内容和空状态插槽扩展内容。
  - icon: 📦
    title: 双通道分发
    details: 推荐 npm 安装；也提供 DCloud 插件市场的 `uni_modules` 形态，导入即用，取舍见安装说明。
---
