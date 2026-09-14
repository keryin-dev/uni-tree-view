# uni-tree-view

<p align="center">
  <img src="https://raw.githubusercontent.com/keryin-dev/uni-tree-view/main/assets/uni-tree-view-logo.svg" alt="uni-tree-view Logo" width="180" />
</p>

[![npm version](https://img.shields.io/npm/v/uni-tree-view.svg)](https://www.npmjs.com/package/uni-tree-view)
[![CI](https://github.com/keryin-dev/uni-tree-view/actions/workflows/ci.yml/badge.svg)](https://github.com/keryin-dev/uni-tree-view/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/uni-tree-view.svg)](./LICENSE)

适用于 uni-app + Vue 3 的跨端树形列表/选择组件，一套代码运行在微信小程序、支付宝小程序和 H5。

**📖 [完整文档](https://keryin-dev.github.io/uni-tree-view/)** · [在线演示](https://keryin-dev.github.io/uni-tree-view/ui/index.html#/) · [快速上手](https://keryin-dev.github.io/uni-tree-view/guide/quick-start) · [API 参考](https://keryin-dev.github.io/uni-tree-view/apis/props) · [常见问题](https://keryin-dev.github.io/uni-tree-view/guide/faq)

> 文档站双线部署，内容原则上保持一致：主入口为 GitHub Pages（上方链接）；访问较慢时可切换到 [Netlify 镜像](https://uni-tree-view.netlify.app/)。

> 使用 AI Coding 工具时，可将 [llms.txt](https://keryin-dev.github.io/uni-tree-view/llms.txt) 作为精简的文档导航入口。

> **版本与兼容性：** 当前发布版本以 npm 和 [CHANGELOG](https://github.com/keryin-dev/uni-tree-view/blob/main/CHANGELOG.md) 为准。`1.0.0` 起按语义化版本维护公开 API；兼容性边界及最终组件体积的测量方式见[版本兼容性与组件体积](https://keryin-dev.github.io/uni-tree-view/guide/versioning)。H5 已有构建和交互验证，微信/支付宝目前主要是构建验证，不代表所有真机都已验证。

## 特性

- 🌲 展开收起、单选/多选、父子联动、严格模式、禁用节点
- 🔍 关键词过滤、自定义匹配、命中高亮
- ⚡ 固定行高虚拟渲染，只渲染可视区域，适合大数据树
- 🔌 懒加载子节点，内置加载中、加载失败和重试状态
- 🎨 主题色、`node-class` 以及文本、图标、尾部内容和空状态插槽自由定制
- 📦 零运行时依赖，npm 与 DCloud 插件市场双通道分发

## 安装

```bash
pnpm add uni-tree-view
```

推荐使用 npm；也可以在 [DCloud 插件市场](https://ext.dcloud.net.cn/plugin?id=29379) 导入 `Uni Tree View`，插件按 `uni_modules` 规范发布，导入后位于 `uni_modules/keryin-tree-view`（CLI 工程为 `src/uni_modules/keryin-tree-view`）。两种方式的取舍见[安装说明](https://keryin-dev.github.io/uni-tree-view/guide/installation)。

> 插件市场迁移说明：插件市场自 `0.6.3` 起使用新的 [插件条目（id=29379）](https://ext.dcloud.net.cn/plugin?id=29379)。`0.6.2` 及更早版本可能来自旧条目，导入目录为 `uni_modules/KieranYin9527-tree`；如果本地仍有旧目录，请先删除，再导入 `uni_modules/keryin-tree-view`。npm 包不受影响。

## 使用

### npm 方式

通过 npm 安装后需要导入组件：

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
import UniTreeView from "uni-tree-view";
import { ref } from "vue";

const checkedValue = ref([]);
const treeData = [
  {
    id: "building-a",
    label: "A 栋",
    children: [
      { id: "floor-a-1", label: "1 层" },
      { id: "floor-a-2", label: "2 层", disabled: true }
    ]
  }
];

function handleCheckChange({ keys }) {
  console.log("当前选中:", keys);
}
</script>
```

### DCloud 插件市场方式

从插件市场导入到 `uni_modules` 后，在 easycom 保持自动扫描开启时，无需手动 import：

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

const checkedValue = ref([]);
const treeData = [
  {
    id: "building-a",
    label: "A 栋",
    children: [
      { id: "floor-a-1", label: "1 层" },
      { id: "floor-a-2", label: "2 层", disabled: true }
    ]
  }
];

function handleCheckChange({ keys }) {
  console.log("当前选中:", keys);
}
</script>
```

`selectable` 控制是否启用选择，`multiple` 控制单选/多选：

| 用法 | 行为 |
| --- | --- |
| 不传 `selectable` | 纯展示树 |
| `selectable` | 单选（单选按钮） |
| `selectable multiple` | 多选（复选框，父子联动） |

禁用节点默认锁定当前选中状态。全选、清空、父子联动、实例方法以及外部更新 `v-model` 时，都不会改变它；需要允许变更时传入 `checked-disabled`。

普通 `class` 作用于组件根容器；需要使用自己的类名定制每个节点行时，传入 `node-class`：

```vue
<uni-tree-view
  class="department-tree"
  node-class="department-tree-node"
  :data="treeData"
/>
```

`tree-props` 只负责数据字段映射，不包含样式配置。

完整的属性、事件、插槽和实例方法（Props / Events / Slots / Methods），以及懒加载与虚拟渲染示例，请见 **[文档站](https://keryin-dev.github.io/uni-tree-view/)**。

## 平台兼容性

| 平台 | 状态 |
| --- | --- |
| H5 | ✅ 构建 + 交互验证 |
| 微信小程序 | ✅ 构建验证 |
| 支付宝小程序 | ✅ 构建验证 |
| App / 其他小程序 | 理论可用，未充分验证 |

点击反馈、内联图标和 `scroll-view` 虚拟滚动等实现说明，见 [平台兼容性文档](https://keryin-dev.github.io/uni-tree-view/guide/platforms)。

## 开发

```bash
pnpm install
pnpm play        # H5 playground
pnpm test        # 单元测试
pnpm check:all   # 完整本地校验，不升版本、不发布
pnpm build       # 构建组件包
pnpm docs        # 本地文档站
```

提交前按变更范围选择检查，不需要每次提交都发布；需要完整校验时只运行一次 `pnpm check:all`。详细流程见 [CONTRIBUTING.md](https://github.com/keryin-dev/uni-tree-view/blob/main/CONTRIBUTING.md)。

## License

本项目使用 [MIT](./LICENSE) 许可证，版权归 keryin-dev 所有。再分发源码、构建产物或主要部分时，请保留版权声明和许可证全文；MIT 不要求在产品界面展示作者名。

使用或改造时的保留要求、推荐署名格式和第三方许可说明，见 [许可证与署名说明](https://keryin-dev.github.io/uni-tree-view/guide/license)。
