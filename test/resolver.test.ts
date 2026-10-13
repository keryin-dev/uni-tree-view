import { describe, expect, it } from "vitest";
import { UniTreeViewResolver } from "../packages/core/resolver";

function getResolverFunction(resolver: ReturnType<typeof UniTreeViewResolver>) {
  return typeof resolver === "function" ? resolver : resolver.resolve;
}

describe("uni-tree-view resolver", () => {
  it("resolves the recommended component name", () => {
    const resolver = UniTreeViewResolver();

    expect(getResolverFunction(resolver)("UniTreeView")).toEqual({
      name: "UniTreeView",
      from: "uni-tree-view"
    });
  });

  it("honors exclude rules", () => {
    const resolver = UniTreeViewResolver({
      exclude: /^UniTree/
    });

    expect(getResolverFunction(resolver)("UniTreeView")).toBeUndefined();
  });
});