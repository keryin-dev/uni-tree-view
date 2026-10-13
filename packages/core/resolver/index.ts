import type { ComponentResolver } from "@uni-helper/vite-plugin-uni-components";
import type { FilterPattern } from "vite";
import { createFilter } from "vite";

const INDEX = "uni-tree-view";

const importsMap = new Map<string, string>([
  ["UniTreeView", INDEX]
]);

export interface UniTreeViewResolverOptions {
  exclude?: FilterPattern;
}

export function UniTreeViewResolver(options: UniTreeViewResolverOptions = {}): ComponentResolver {
  const filter = createFilter(undefined, options.exclude, { resolve: false });

  return {
    type: "component",
    resolve(name) {
      if (!filter(name) || !importsMap.has(name)) {
        return;
      }

      return {
        name,
        from: importsMap.get(name)!
      };
    }
  };
}