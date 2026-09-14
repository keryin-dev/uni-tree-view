# AGENTS.md

给在本仓库工作的 AI agent 使用。只记录容易误判、容易造成回归或需要跨文件同步的项目约束；一般开发常识以现有代码和脚本为准。

## 项目边界

- 这是一个 uni-app + Vue 3 组件库的 pnpm workspace。pnpm 版本由根目录 `packageManager` 固定，Node.js 版本以 `.nvmrc` 为准。
- `packages/core` 是实际发布的 `uni-tree-view`；根目录 package 只负责 workspace 脚本并保持 `private: true`。
- `playground` 是本地演示和跨端构建工程，workspace 中直接从 `uni-tree-view` 导入组件。
- `packages/core` 保持零运行时依赖，Vue 作为 peer dependency。只服务于演示、文档或构建的依赖不要加入发布包。
- 工作区可能已有用户未提交的修改。不要撤销、覆盖、格式化、暂存或提交任务范围外的变更。

## 常用命令

- 安装依赖：`pnpm install`。
- 启动 H5 playground：`pnpm play`。
- 同时启动文档站和 playground：`pnpm docs`。
- 构建组件包：`pnpm build`。
- 常规代码全量检查：`pnpm check`（包含覆盖率下限及 npm 分发内容检查）。
- 完整本地校验：`pnpm check:all`（依次运行 `check`、`check:platforms`、`check:size`、`docs:build`，不提升版本、不发布）。
- 最终组件体积检查：`pnpm check:size`，使用无组件/有组件的最小工程进行三端生产构建对照。
- 完整构建并校验文档站：`pnpm docs:build`。
- 构建微信和支付宝小程序：`pnpm check:platforms`。
- 构建 DCloud 发布产物：`pnpm build:uni`。

## 开发与跨平台约束

- 文本文件保持 LF；优先使用 Node/pnpm 脚本和 `node:path`，不要新增依赖特定操作系统 shell 或写死 Windows、macOS 路径的实现。
- `playground/src/pages.json` 和 `playground/src/manifest.json` 是当前实际使用的静态 uni-app 配置来源。
- `playground/vite.config.ts` 只接入 uni-app 插件；Pages/Manifest 配置生成、UnoCSS 和自动导入插件未启用，不要新增未接入的同名配置文件。演示工程不初始化全局 store，业务状态由各示例自行管理。
- 不要新增 `<route>` 自定义块或导入 `virtual:uno.css`。确需恢复相关插件时，应完成 Vite 接入，并至少验证 H5、微信小程序、支付宝小程序和 Windows 构建。
- 不要根据依赖列表推断平台兼容性。支持范围和结论只以当前实现、实际构建验证及 `docs/guide/platforms.md` 为准。

## 组件与公开 API

- 主组件：`packages/core/src/components/uni-tree-view/uni-tree-view.vue`。
- 公开类型：`packages/core/src/components/uni-tree-view/types.ts` 和 `uni-tree-view.vue.d.ts`；完整 props、事件、插槽和 ref 方法清单以这些文件及实现为准，不在本文件重复维护能力列表。
- 修改公开能力时，同步检查 `defineProps`/`withDefaults`、`defineEmits`、`defineSlots`、`defineExpose`、`types.ts`、`.d.ts`、对应测试、API 文档和 playground 示例。不要只让运行时或类型中的一侧生效。
- `treeProps` 只映射 `id`、`label`、`children`、`disabled`、`leaf`、`append`、`icon` 字段名；节点行外部样式类使用一级 `nodeClass` prop，不要把它塞入 `treeProps`。
- 行为变更优先补测试。测试按展开、选中、半选、禁用、受控值、默认值、公开方法和事件 payload 等行为组织；优先纯逻辑或最小组件场景，不为单个逻辑引入沉重的跨平台 E2E 依赖。
- `tsconfig.test.json` 只启用 `lib: ES2020` 和 `types: node`，测试里没有 DOM 全局（`MutationObserver`、`Element` 等）也没有 ES2022 方法（如 `Array.prototype.at`）。断言 DOM 行为请使用 `@vue/test-utils` 的 API，不要为个别用例放宽该配置。

## 文档约束

- 文档以当前实现、公开类型、测试和演示为准，不写未经验证的平台兼容性、性能数字或边界行为。
- 对外文档面向组件使用者、集成开发者或贡献者，保持中立的项目文档视角。不要把维护者与 AI 的对话、个人意图或本次修改过程写入正文。
- 指南解释用法，API 页面用于查询；FAQ 标题描述真实现象并先给结论。示例必须可复制，包含必要导入和上下文，不保留无效参数。
- `key`、`v-model`、受控/非受控、单选/多选等术语保持一致，模板属性名优先使用 kebab-case。避免为了统一文风制造与任务无关的大面积改写。
- 根目录 `README.md` 是公共 README 的来源；`packages/core/scripts/post-build.ts` 会基于它生成带发布链接的 `packages/core/README.md`。不要独立维护两份不同内容，修改后通过构建检查生成结果。

## 构建与生成文件

- `uni-tree-view/resolver` 的最终导出位于 `packages/core/dist-resolver/index.*`。unbuild 会先生成 `dist-resolver/resolver/*`，随后 `packages/core/scripts/post-build.ts` 再整理到根级入口；不要因中间阶段的缺失警告直接修改 exports，应检查命令退出码和最终文件。
- `pnpm docs` 通过 `VITE_DEMO_URL` 连接本地 playground。`pnpm docs:build` 先将 H5 demo 生成到 `docs/public/ui`，再构建 VitePress，并由 `pnpm docs:check` 校验在线演示入口、iframe 和静态资源。
- 文档站默认按根路径 `/` 构建：GitHub Pages 通过自定义域名 `uni-tree-view.keryin.top` 从根路径提供，Netlify 镜像同样在根路径。修改文档部署路径时，同时检查 `DOCS_BASE`、`PLAYGROUND_DOCS_BASE`、`DOCS_SITE_URL`、带 `index.html` 的静态入口及 Netlify/GitHub Pages 两种部署形态。
- 不要手动编辑生成物，包括 `dist`、`dist-resolver`、`docs/public/ui`、`docs/.vitepress/dist`、`artifacts`、`coverage`、`playground/src/uni_modules` 和 playground 生成的类型文件。
- 变更日志只维护根目录 `CHANGELOG.md`；`packages/core/CHANGELOG.md` 在 npm 打包前生成，不要手动编辑。
- 根目录 `CHANGELOG.md` 的 `Unreleased` 段落由 `pnpm changelog:generate` 从提交标题生成。该段落一旦有内容，生成器会判定为 `keep` 并跳过本次全部提交（见 `scripts/changelog-utils.ts`），因此普通任务不要手写条目——把信息写进提交标题即可。

## 维护者本地文件

- `.local/` 已被 `.gitignore` 忽略，是维护者的私有目录，内部是独立的 git 仓库，存放发布操作说明 `RELEASE.md` 和待办文档 `TODO-*.md`。用户提到"release 文档""todo""待办"而未指明路径时，默认指这个目录下的文件，不要在主仓库另建同名文件。不要把其中文件加入本仓库的暂存区或提交，也不要把其内容写进公开文档或提交信息。
- 修改 `.local/` 内的文档后，运行 `git lsync`（本机别名，等价于 `sh .local/sync.sh`）提交并推送到私有远程；开始涉及这些文档的任务前先执行一次以拉取最新版本。
- `.local/` 不存在时说明当前不是维护者机器，忽略本节。

## Git 与发布约束

- 提交信息遵循仓库的 Conventional Commits 校验，使用中文简述；准确格式和允许的 type 以 `scripts/check-commit-message.ts`、`scripts/changelog-utils.ts` 为准。
- 用户说“提交代码”时，按功能边界检查暂存区并分批执行 `git add`、`git commit`；不要混入任务外现有改动。
- Git 提交只能沿用当前开发者已有身份。不得执行 `git config user.name`、`git config user.email`、`git commit --author`，也不得添加 `Co-authored-by`、`Signed-off-by`、`Generated-by` 或任何 AI/机器人署名。
- 提交后运行 `git show -s --format=fuller HEAD`，确认 Author、Committer、提交消息和尾注均符合要求。
- “提交代码”不包含 push。只有用户明确要求“push”或“推送”时才可执行 `git push`。
- 普通功能任务不要修改版本号、创建 release commit/tag 或执行发布命令；这些操作必须由用户明确要求。

## 交付前验证

按变更范围执行，不为纯文案改动无意义地运行所有构建：

- 组件、脚本或配置代码：`pnpm check`。
- 组件逻辑、样式、依赖或构建设置可能影响产物体积时：`pnpm check:size`；不要用 playground、文档站或 npm 压缩包的大小代替实际引入增量。
- 文档结构、示例、部署路径或在线演示：`pnpm docs:build`。
- 跨端模板、样式、事件或平台相关改动：在常规检查外运行 `pnpm check:platforms`。
- DCloud 打包逻辑或发布内容：运行 `pnpm build:uni`。
- 任何文本改动至少运行 `git diff --check`。

上述检查按变更范围叠加；需要全部执行时可用 `pnpm check:all`，无需再分别重复运行。同一批最终改动拆分为多个提交，不要求为每个提交重复全量构建；新增或调整代码后应重跑受影响检查。日常提交不包含发布；`pnpm release` 已通过 `release:prepare` 调用完整校验，不要把 `release:prepare` 当作提交前检查单独执行。

交付时说明实际运行的命令和结果。Browserslist 的 `caniuse-lite` 提示，以及 unbuild 在 post-build 前报告 resolver 临时入口缺失，可以是非阻断输出；仍须以退出码和最终产物为准。

## 参考资料

- 查询 uni-app API、条件编译、平台差异、`pages.json` 或 `manifest.json` 时，若环境提供 `uni-app` skill，优先使用它。
- 不要把外部 skill 或大段通用参考资料复制进仓库；本仓库行为以代码、测试和本文件为准。
