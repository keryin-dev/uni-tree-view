'use strict';

const vite = require('vite');

const INDEX = "uni-tree-view";
const importsMap = /* @__PURE__ */ new Map([
  ["UniTreeView", INDEX]
]);
function UniTreeViewResolver(options = {}) {
  const filter = vite.createFilter(void 0, options.exclude, { resolve: false });
  return {
    type: "component",
    resolve(name) {
      if (!filter(name) || !importsMap.has(name)) {
        return;
      }
      return {
        name,
        from: importsMap.get(name)
      };
    }
  };
}

exports.UniTreeViewResolver = UniTreeViewResolver;
