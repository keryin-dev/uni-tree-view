# 贡献指南

感谢你愿意为 uni-tree-view 做贡献！

## 项目定位

在动手前请了解本项目的两条设计约束：

1. **移动端体积与性能敏感**——核心包保持零运行时依赖，不内置搜索框、弹窗等可由业务组合实现的能力。
2. **跨端一致**——优先使用 uni-app 标准组件和 API，避免引入只适用于单端的实现。支持范围与实际验证程度以 `docs/guide/platforms.md` 为准，不能把构建成功等同于真机交互通过。

超出树组件核心职责的功能建议先开 issue 讨论。

## 开发环境

- Node.js 版本以 `.nvmrc` 为准，pnpm 版本以根目录 `packageManager` 为准
- 文本文件使用 LF 行尾

```bash
pnpm install        # 安装依赖
pnpm play           # 启动 H5 playground
pnpm play:mp-weixin # 微信小程序调试（需微信开发者工具）
pnpm docs           # 启动文档站
```

## 目录结构

```
packages/core   组件包本体（发布为 uni-tree-view）
playground      uni-app 演示工程
docs            VitePress 文档站
test            单元测试
scripts         构建脚本（build:uni 生成 DCloud 发布文件）
artifacts       本地产物（HBuilderX 发布用工程、npm 包 tgz）
```

## 实现边界

- 主组件负责渲染、事件和滚动容器交互；树结构、选中与懒加载状态由 `useTreeViewState` 管理，虚拟列表下标与占位计算由 `useVirtualTreeList` 管理。不要为了拆文件引入第二份状态来源。
- 演示工程使用 `src/pages.json`、`src/manifest.json` 和普通组件样式，不接入 Pages/Manifest 配置生成、UnoCSS 或自动导入插件，也不初始化未使用的全局 store（跨组件共享状态容器）。
- 主组件不依赖 `/shared` 工具集合或构建时 resolver（供自动导入工具识别组件入口的解析器），新增辅助代码应继续保持这个边界。

## 提交前检查

检查按变更范围选择，不是每次提交都按顺序运行所有命令。命中多种变更时，叠加对应检查：

| 变更范围 | 检查命令 |
| --- | --- |
| 任何文本改动 | `git diff --check` |
| 组件、脚本、配置或测试代码 | `pnpm check` |
| 组件逻辑、样式、依赖或构建设置可能影响运行产物体积 | 额外运行 `pnpm check:size` |
| 跨端模板、样式、事件或平台适配 | 额外运行 `pnpm check:platforms` |
| 文档结构、示例、部署路径或在线演示 | `pnpm docs:build` |
| DCloud 打包逻辑或发布内容 | `pnpm build:uni` |

纯文案勘误不需要所有构建。日常调试可先运行 `pnpm test` 或指定测试文件，准备提交时再完成对应范围的检查。同一批最终改动按功能拆成多个提交，不需要为每个提交重复全量构建；代码再次调整后，应重跑受影响检查。

需要完整本地校验时，只运行：

```bash
pnpm check:all
```

它依次运行 `check`、`check:platforms`、`check:size`、`docs:build`，不会提升版本、创建 tag 或发布。无需在它之前或之后再重复执行这四项。执行时会显示 `[当前步/总步数]` 和每步耗时；任一步失败即停止，并提示单独重跑的命令。

`pnpm check` 包含 lint、类型、带覆盖率下限的测试、组件构建及 npm/DCloud 分发内容检查。`pnpm check:size` 使用最小工程的三端生产构建，不拿整个演示站的大小代替组件大小；`check:platforms` 则构建实际 playground，检查目标不同，不能互相替代。

修改组件能力时请注意：

- 运行时 props/emits 与 `types.ts`、`uni-tree-view.vue.d.ts` 保持同步
- 补充对应的单元测试（按展开/选中/禁用/事件 payload 等行为分组）
- 更新 `docs/` 对应 API 文档；公开约定和体积检查口径见 `docs/guide/versioning.md`
- 默认通过提交标题生成发布说明，不在普通功能提交中手写 `Unreleased`。该段一旦有内容，生成器会保留它并跳过本次全部提交，不能期待自动合并

修改 `playground/` 示例时请注意：这份工程会被打包成插件市场的示例工程，而那份工程里没有 npm 版组件，`<uni-tree-view>` 只能由 easycom 从 `uni_modules` 解析。构建脚本会自动删除运行时 `import`、把纯类型导入改指向插件目录；其余导入形态（默认导入混具名等）会直接报错，需要手工拆成这两种。`pnpm check` 会断言生成工程不再引用 `uni-tree-view`，CI 还会把它装到仓库外独立构建一次。

## 提交规范

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

```
feat: 增加 xxx 能力
fix: 修复 xxx 在支付宝小程序下的表现
docs: 补充 xxx 示例
```

提交标题会由本地 `commit-msg` hook 校验，CI 还会检查 PR 标题以及变更范围内的全部非 merge 提交，格式为 `<type>(<scope>)!: <description>`。允许的类型包括 `build`、`chore`、`ci`、`docs`、`feat`、`fix`、`perf`、`refactor`、`revert`、`style` 和 `test`；其中 `feat`、`fix`、`perf`、`refactor` 以及带破坏性标记的提交会进入自动发布说明。

### 避免重复提交

在多设备协作或分支长期开发时，建议：

- 尽早开 draft PR，即使功能未完成，这样 CI 会在每次推送时自动运行
- 多设备同步时，使用 `git pull --rebase` 而不是 `git pull`，避免产生不必要的合并提交
- 如果同一改动在不同设备上各自提交了，PR 前用 `git rebase -i` 整理历史，去掉重复的提交
- 合并到 main 时使用快进合并或 rebase，不要使用 squash merge（发布说明按提交标题逐条生成，squash 会把整个分支压成一条）

## 版本与发布说明

贡献者只需按功能边界提交代码、测试和文档。版本号、release commit、tag、npm 发布和 DCloud 插件市场发布由项目维护者统一处理，请不要在功能提交中修改版本号。

日常 `git commit` 与发布是两条流程；提交后可以继续开发，不必运行 `release` 或 `release:push`。维护者准备发布新版本时，在已合入功能改动且工作区干净的 `main` 上运行 `pnpm release`，它会自动执行完整校验，通过后才创建版本提交和 tag；不需要先手工重复四项检查。确认产物后再执行 `pnpm release:push` 推送版本提交与 tag。`release:prepare` 会更新变更日志，只供发布脚本调用，不是日常检查命令。

变更日志只维护仓库根目录 `CHANGELOG.md`；npm 包内的 `CHANGELOG.md` 会在打包前自动生成。迁移步骤优先写入对应指南或 FAQ。维护者确需手工填写 `Unreleased` 时，应整理完整的发布说明，因为后续生成不会再补入遗漏提交。

npm 发布由 tag 触发的 release 工作流自动完成；DCloud 插件市场按 `uni_modules` 规范发布，必须由维护者在 HBuilderX 中手动操作，贡献者无需关心。
