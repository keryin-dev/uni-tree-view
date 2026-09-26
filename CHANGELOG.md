# Changelog

本项目的显著变更会记录在此文件中，版本号遵循 Semantic Versioning。

## Unreleased

## 1.1.0 - 2026-09-26

### Changed

- **Breaking:** **style:** 组件样式与 indent 缩进单位由 rpx 改为 px。

### Fixed

- **playground:** 示例页标签栏改用原生吸顶，修复支付宝真机切换不灵敏。
- **style:** 选中背景改为过渡背景色，减少下方节点抖动。

## 1.0.0 - 2026-09-15

### Added

- **virtual:** scrollToKey 返回定位指令提交语义。

### Changed

- **virtual:** 无可滚动范围时不安排偏移测量。
- **core:** 可见节点保持响应式引用。
- **virtual:** 固定渲染窗口多覆盖一行，避免行内滚动重建窗口。
- **virtual:** 优化虚拟滚动定位与位置校正。
- **core:** 减少选中态计算与响应式依赖收集的开销。

### Fixed

- **test:** 归一化 dev-docs 子进程环境变量大小写。
- **build:** 分发检查忽略 Finder 元数据。
- **virtual:** 适配支付宝小程序查询作用域。
- **core:** 已可见的命中节点仍登记自身匹配。
- **virtual:** 修正虚拟滚动位置校正。
- **core:** 虚拟模式定位后释放 scroll-top 指令值。
- **core:** 滚动停稳后校正虚拟列表的渲染窗口。
- **core:** 小程序端筛选后把夹紧的滚动位置写回 scroll-view。
- **build:** 修正 pnpm build 因引号问题导致的空运行。
- **core:** 修正虚拟列表在可见项减少后的滚动位置。

## 0.6.4 - 2026-08-26

### Changed

- **dcloud:** 重新发布插件市场版本，补充插件预览图并完善市场条目元数据。

## 0.6.3 - 2026-08-24

### Removed

- **core:** 移除 0.3.0 起标记废弃的过渡别名 `packDisabledkey` / `pack-disabledkey`，统一使用规范命名 `packDisabledKey` / `pack-disabled-key`。行为与默认值（`true`）不变，仍在使用旧拼写的工程改用新名即可。

### Changed

- **dcloud:** 插件 ID 由 `KieranYin9527-tree` 改为 `keryin-tree-view`，从市场导入后的插件目录名随之变化。已装旧版的工程需删除 `uni_modules/KieranYin9527-tree`（CLI 工程为 `src/uni_modules/KieranYin9527-tree`）后再导入新版，并把显式的类型导入路径改指向新目录；npm 通道不受影响。

## 0.6.2 - 2026-08-17

### Changed

- **docs:** 澄清 `uni_modules` 插件重新安装、更新及安装方式切换的影响范围。

## 0.6.1 - 2026-08-16

### Fixed

- **dcloud:** 更新并上传 `uni_modules` 示例工程，移除旧 `components` 使用方式及 npm 包依赖。

## 0.6.0 - 2026-08-16

### Added

- **dcloud:** 将插件市场发布迁移为 `uni_modules`，从市场导入后由 easycom 自动注册，不再落入项目的 `components` 目录。
- **core:** 新增 `getMatchedKeys` / `getMatchedNodes` 实例方法，用于获取当前过滤条件下直接命中的节点。

### Changed

- **core:** `setCheckedKeys` 现在返回实际生效的选中值；懒加载节点尚未出现时会等待节点加载，再补选并触发选中事件。
- **core:** 非懒加载模式下，`data` 更新会清理受控 `modelValue` 中已经不存在的 key；过滤期间状态树变化也会重新触发 `filter-change`。
- **core:** `show-path` 不再为根节点重复显示仅包含自身的路径行。

### Fixed

- **package:** 收紧公开子路径导出，只保留主入口、`shared`、`resolver` 和 `global`，避免依赖包内未承诺的实现路径。
- **build:** 强化文档和 README 构建校验。
- **docs:** 修复文档开发进程退出码与端口解析。

## 0.5.1 - 2026-08-14

### Fixed

- 修复 npm 安装使用时具名插槽在 IDE 中无法识别的问题，并保留 `$props` / JSX 事件回调的 payload 类型。

## 0.5.0 - 2026-08-13

### Fixed

- **docs:** 修正文档演示入口。

## 0.4.2 - 2026-08-12

### Fixed

- 修复微信、支付宝小程序中节点选中或反选时，选中态样式触发页面抖动的问题。
- 修复小程序中点击复选框时事件继续冒泡，导致选中或反选偶发无效的问题；开启 `check-on-click-node` 后，点击节点标签也可稳定切换选中状态。

## 0.4.1 - 2026-08-11

### Fixed

- 兼容带 emoji 前缀的提交信息。

## 0.4.0 - 2026-08-11

### Added

- 为 `check-change` 事件 payload 增加 `halfCheckedKeys` / `halfCheckedNodes` 字段，便于直接读取父子联动模式下的半选状态。
- 为 `filter-change` 事件 payload 增加 `matchedKeys` / `matchedNodes` 字段，区分直接命中节点与包含祖先后代的最终可见节点。
- 新增 `check-on-click-leaf` 属性，支持仅点击叶子节点行时切换选中状态，默认 `false`。
- 新增 `accordion` 属性，支持手风琴模式（展开节点时自动收起同级已展开节点），默认 `false`。
- 新增 `empty-filter` 插槽，用于筛选无结果时的专用空状态，未提供时自动回退到 `empty` 插槽。

### Changed

- 优化默认、图标、标签和尾部插槽的回退渲染，仅在提供对应插槽时进入插槽分支，避免小程序生成无内容的插槽节点。
- 基础示例与 playground 不再默认开启 `expand-on-click-node`，默认演示与组件一致的箭头展开交互，同时保留实时切换入口。

### Fixed

- 修复 `default-expanded-keys` 指定后代节点时未自动展开所有祖先的问题。
- 新增 `default-expand-parent` 属性控制是否自动展开祖先，默认 `true`（保持修复后的行为）。
- 修复小程序中箭头或选择控件点击继续冒泡到节点行，导致展开、选中和 `node-click` 行为相互冲突的问题。

### Tests

- 补充箭头与选择控件快速连续点击的组件回归测试，确保嵌套控件行为不会误触发节点行交互。

## 0.3.2 - 2026-08-04

### Fixed

- 修复 GitHub Pages 示例预览 404。

## 0.3.1 - 2026-08-01

### Fixed

- 修复在线演示未使用 hash 路由导致页面直达失败的问题，并补充 Netlify 部署回退配置。

## 0.3.0 - 2026-08-01

### Changed

- 新增 `packDisabledKey` / `pack-disabled-key` 规范命名，并暂时保留旧 `packDisabledkey` / `pack-disabledkey` 作为废弃别名。
- 优化选中事件 payload 构建与受控 `v-model` 等价回流，避免重复遍历和不必要的全量选中态重放。
- 为组件公开实例方法增加 `UniTreeViewExposed` 编译期一致性校验，并补充懒加载公开方法的行为说明。
- 明确 `uni-tree-view/shared` 继续提供共享运行时工具，并清理 resolver 中无关的模板注释。

### Fixed

- 修复全选、清空、父子联动和受控值回放可能绕过 `checked-disabled` 改变禁用节点状态的问题。
- 修复 `mitt` 通配监听器未接收事件类型的问题。

### Tests

- 补充整行点击组合行为、空状态插槽、关键词高亮、普通模式滚动、属性兼容迁移、受控行为切换和共享工具契约测试。

## 0.2.0 - 2026-07-31

### Changed

- 规范组件内部 SCSS 元素类与状态类命名，保留 `nodeClass` 公开样式入口不变。

### Tests

- 按结构与展开、选择、懒加载拆分树状态测试，并补齐组件公开事件 payload 的集成链路验证。

## 0.1.0 - 2026-07-30

### Fixed

- npm 发布迁移到 GitHub Actions Trusted Publishing，并支持手动重试已有发布标签。
- 规范 npm 包仓库元数据，并升级 Release workflow 的 Node 环境 Action 至 v7，消除 npm 11 发布警告。

## 0.0.9 - 2026-07-29

### Fixed

- 修复 GitHub Actions 发布标签校验脚本被 shell 提前解析导致发布中断的问题。
- 发布前预检变更日志，并在 bumpp 执行失败且尚未创建提交时自动恢复被修改的跟踪文件。

## 0.0.8 - 2026-07-29

### Added

- 节点整行选择与整行展开开关。
- 增加 `node-class` 一级属性，作为每个节点行的外部样式入口。
- 自定义过滤方法、关键词高亮和空状态插槽。
- scrollToKey、懒加载错误事件和重试方法。
- 大数据虚拟渲染演示和多平台构建说明。

### Changed

- **Breaking:** 选择入口由 `showCheckbox` 更名为 `selectable`，选择控件位置由 `checkboxPlacement` 更名为 `selectionPlacement`，旧属性不再保留。
- **Breaking:** 选中与展开事件统一为 `check-change` 和 `expand-change`，选中事件类型更名为 `TreeCheckChangePayload`。
- `treeProps` 只负责 `id`、`label`、`children`、`disabled`、`leaf`、`append`、`icon` 数据字段映射；节点行样式统一通过一级 `nodeClass` 属性传入。
- 优化移动端按压反馈、选择区域、选中态和加载状态。
- 优化文档站示例页实时预览布局：宽屏挂载到右侧栏，窄屏以可折叠卡片展示。
- 文档预览 playground 改用项目 Logo，并移除 H5 路由固定 base 以适配文档内嵌预览。
- Playground 迁移到 Wot UI v2；核心组件仍保持零 Wot UI 依赖。

### Removed

- 移除 `field`、`labelField`、`valueField`、`childrenField`、`disabledField`、`leafField`、`appendField`、`iconField` 等旧字段映射属性，统一使用 `treeProps`。
- 移除 `defaultExpandedIds` 展开别名，统一使用 `defaultExpandedKeys`。
- 移除 `change`、`checked`、`updated`、`expand`、`goChild` 等历史事件别名。
- 移除 `treeProps.class` 样式映射，改用 `nodeClass`。

### Fixed

- 禁用且已选节点继续使用禁用样式。
- 补齐懒加载旋转动画和失败后的重试状态。
