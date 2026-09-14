import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import Uni from "@dcloudio/vite-plugin-uni";
import type { PluginOption } from "vite";
import { defineConfig } from "vite";

function r(...paths: string[]) {
  return path.resolve(process.cwd(), ".", ...paths);
}

function getComponentVersion() {
  const packageJsonPaths = [
    r("src", "uni_modules", "keryin-tree-view", "package.json"),
    r("..", "packages", "core", "package.json")
  ];

  for (const packageJsonPath of packageJsonPaths) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        version: string;
      };
      return packageJson.version;
    } catch {}
  }

  throw new Error("Unable to resolve uni-tree-view version");
}

function buildTransformAssetUrls() {
  return {
    tags: {
      "wd-img": ["src"]
    }
  };
}

function buildPlugins(): PluginOption[] {
  return [
    // @ts-expect-error whatever
    Uni.default({
      vueOptions: {
        template: {
          transformAssetUrls: buildTransformAssetUrls()
        }
      }
    })
  ];
}

export default defineConfig(({ mode }) => {
  // docs 模式的产物挂在文档站的 ui/ 下，base 必须与文档站的 DOCS_BASE 对齐（默认根路径）
  const docsH5Base = process.env.PLAYGROUND_DOCS_BASE ?? "/ui/";
  const h5Base = mode === "docs" ? docsH5Base : "/ui/";

  return {
    root: process.cwd(),
    base: process.env.UNI_PLATFORM === "h5" ? h5Base : "/",
    define: {
      __UNI_TREE_VIEW_VERSION__: JSON.stringify(getComponentVersion())
    },
    resolve: {
      alias: {
        "@": r("src")
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          // wot-ui v2 依赖 sass >= 1.78，使用 modern-compiler 避免 legacy-js-api 警告
          api: "modern-compiler",
          silenceDeprecations: ["legacy-js-api"]
        }
      }
    },
    plugins: buildPlugins(),
    build: {
      target: "es6",
      cssTarget: "chrome61"
    }
  };
});