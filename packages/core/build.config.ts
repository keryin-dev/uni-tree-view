import { defineBuildConfig } from "unbuild";

export default defineBuildConfig([
  {
    name: "uni-tree-view",
    entries: [
      "src/index.js"
    ],
    outDir: "dist",
    clean: true,
    declaration: true,
    externals: [
      "vue"
    ],
    failOnWarn: false
  },
  {
    name: "uni-tree-view/resolver",
    entries: [
      "resolver/index.ts"
    ],
    outDir: "dist-resolver",
    clean: true,
    declaration: true,
    externals: [
      "@uni-helper/vite-plugin-uni-components",
      "vite"
    ],
    failOnWarn: false,
    rollup: {
      emitCJS: true
    }
  }
]);