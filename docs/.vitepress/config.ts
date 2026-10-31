import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import type { DefaultTheme } from "vitepress";

const docsRoot = fileURLToPath(new URL("..", import.meta.url));

/* 与 VitePress 内置（@mdit-vue/shared）完全一致的 slugify，
   保证侧边栏锚点与正文标题 id 始终对得上 */
// eslint-disable-next-line no-control-regex -- 对齐 @mdit-vue/shared 的原始实现
const rControl = /[\u0000-\u001F]/g;
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g;
const rCombining = /[\u0300-\u036F]/g;

function slugify(str: string): string {
  return str
    .normalize("NFKD")
    .replace(rCombining, "")
    .replace(rControl, "")
    .replace(rSpecial, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^(\d)/, "_$1")
    .toLowerCase();
}

/* 示例页在左侧菜单下挂"本页目录"子菜单：构建时从 md 提取二级标题，
   文档增删章节后侧边栏自动跟随，无需手工维护 */
function exampleItem(text: string, name: string): DefaultTheme.SidebarItem {
  const source = fs.readFileSync(path.join(docsRoot, "examples", `${name}.md`), "utf8");
  const body = source.replace(/```[\s\S]*?```/g, "");
  const items = [...body.matchAll(/^##[ \t]+(\S.*)$/gm)].map(([, heading]) => ({
    text: heading.trim(),
    link: `/examples/${name}#${slugify(heading.trim())}`
  }));
  return { text, link: `/examples/${name}`, collapsed: true, items };
}

/* 文档站在 GitHub Pages（自定义域名 uni-tree-view.keryin.top）和 Netlify 上都从根路径提供，
   默认按 "/" 构建；若要部署到 <user>.github.io/<repo>/ 这类子路径，用 DOCS_BASE、
   PLAYGROUND_DOCS_BASE 和 DOCS_SITE_URL 覆盖，三者需保持一致（见 scripts/check-docs-build.ts） */
const siteBase = process.env.DOCS_BASE ?? "/";
// VitePress 会自动为站内链接补上 base；这里保持根相对路径，避免重复拼接 base。
const demoLink = process.env.VITE_DEMO_URL ?? "/ui/index.html";
const siteUrl = process.env.DOCS_SITE_URL ?? "https://uni-tree-view.keryin.top";

/* 本地搜索的中文分词：MiniSearch 默认只按空白和标点切词，整句中文会变成一个长词，
   「半选」「滚动错位」这类出现在句中的词搜不到。这里把连续的中日韩字符切成二元组
   （单字时保留单字），建索引和查询共用同一规则，并以 AND 组合多个片段。
   VitePress 会把函数序列化后发往浏览器，因此函数体必须自包含，不能引用外部变量。 */
function tokenizeSearchText(text: string): string[] {
  const tokens: string[] = [];
  for (const piece of text.split(/[\s\p{P}\p{S}]+/u)) {
    for (const run of piece.match(/[\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF]+|[^\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF]+/gu) ?? []) {
      if (!/[\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF]/u.test(run)) {
        tokens.push(run);
      } else if (run.length === 1) {
        tokens.push(run);
      } else {
        for (let index = 0; index < run.length - 1; index += 1) {
          tokens.push(run.slice(index, index + 2));
        }
      }
    }
  }
  return tokens;
}

export default defineConfig({
  lang: "zh-CN",
  title: "Uni Tree View",
  description: "适用于 uni-app + Vue 3 的跨端树形列表/选择组件，支持微信/支付宝小程序和 H5",
  base: siteBase,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${siteBase}favicon.svg` }],
    ["meta", { property: "og:image", content: `${siteUrl}/social-card.png` }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }]
  ],
  lastUpdated: true,
  themeConfig: {
    logo: { src: "/logo.svg", alt: "uni-tree-view Logo" },
    nav: [
      { text: "指南", link: "/guide/introduction", activeMatch: "/guide/" },
      { text: "API", link: "/apis/props", activeMatch: "/apis/" },
      { text: "示例", link: "/examples/basic", activeMatch: "/examples/" },
      { text: "在线演示", link: demoLink, target: "_self" }
    ],
    sidebar: {
      "/guide/": [
        {
          text: "开始",
          items: [
            { text: "介绍", link: "/guide/introduction" },
            { text: "安装", link: "/guide/installation" },
            { text: "快速上手", link: "/guide/quick-start" }
          ]
        },
        {
          text: "进阶",
          items: [
            { text: "平台兼容性", link: "/guide/platforms" },
            { text: "版本兼容性与体积", link: "/guide/versioning" },
            { text: "常见问题", link: "/guide/faq" },
            { text: "许可证与署名", link: "/guide/license" }
          ]
        }
      ],
      "/apis/": [
        {
          text: "API 参考",
          items: [
            { text: "Props", link: "/apis/props" },
            { text: "Events", link: "/apis/events" },
            { text: "Slots", link: "/apis/slots" },
            { text: "Methods", link: "/apis/methods" },
            { text: "类型定义", link: "/apis/types" }
          ]
        }
      ],
      "/examples/": [
        {
          text: "示例",
          items: [
            exampleItem("基础用法", "basic"),
            exampleItem("单选与多选", "selection"),
            exampleItem("搜索过滤", "filter"),
            exampleItem("懒加载", "lazy-load"),
            exampleItem("虚拟渲染", "virtual"),
            exampleItem("自定义插槽", "slots")
          ]
        }
      ]
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/keryin-dev/uni-tree-view" }
    ],
    outline: { label: "本页目录", level: [2, 3] },
    docFooter: { prev: "上一页", next: "下一页" },
    lastUpdatedText: "最后更新",
    search: {
      provider: "local",
      options: {
        miniSearch: {
          options: { tokenize: tokenizeSearchText },
          searchOptions: { tokenize: tokenizeSearchText, combineWith: "AND" }
        }
      }
    },
    footer: {
      message: "Released under the MIT License · 使用或改造请保留版权与许可声明",
      copyright: "Copyright © 2025-present keryin-dev"
    }
  }
});