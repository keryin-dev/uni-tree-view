import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// 复用 playground 声明的 uni 编译器，按真实平台预处理条件块；不要直接执行全部 #ifdef。
const requirePlayground = createRequire(new URL("../playground/package.json", import.meta.url));
const { initPreContext, preJs } = requirePlayground("@dcloudio/uni-cli-shared/dist/preprocess/index.js") as {
  initPreContext: (platform: string) => void;
  preJs: (source: string) => string;
};
const source = readFileSync(new URL("../packages/core/src/utils/env.js", import.meta.url), "utf8");

function platformFlags(target: string) {
  initPreContext(target);
  const code = preJs(source).replace(/\bexport /g, "");
  return runInNewContext(`${code}\n({ platform, isMp, isApp, isQuickappWebview, isWeb, isOtherPlatform, isMpWeixin, isMpAlipay, isAppHarmony, isQuickappWebviewHuawei, isQuickappWebviewUnion });`) as Record<string, string | boolean>;
}

describe("shared platform predicates after uni preprocessing", () => {
  it.each(["mp-weixin", "mp-alipay", "mp-baidu", "mp-toutiao", "mp-lark", "mp-qq", "mp-kuaishou", "mp-jd", "mp-360", "mp-xhs", "mp-harmony"])("includes %s in the mini-program family", (target) => {
    const flags = platformFlags(target);
    expect(flags.platform).toBe(target.toUpperCase());
    expect(flags.isMp).toBe(true);
    expect(flags.isMpWeixin).toBe(target === "mp-weixin");
    expect(flags.isMpAlipay).toBe(target === "mp-alipay");
    expect(flags.isApp).toBe(false);
    expect(flags.isQuickappWebview).toBe(false);
  });

  it.each(["app-plus", "app-harmony"])("includes %s in the App family", (target) => {
    const flags = platformFlags(target);
    expect(flags.isApp).toBe(true);
    expect(flags.isAppHarmony).toBe(target === "app-harmony");
    expect(flags.isMp).toBe(false);
    expect(flags.isQuickappWebview).toBe(false);
  });

  it.each(["quickapp-webview", "quickapp-webview-huawei", "quickapp-webview-union"])("includes %s in the Quick App family", (target) => {
    const flags = platformFlags(target);
    expect(flags.isQuickappWebview).toBe(true);
    expect(flags.isQuickappWebviewHuawei).toBe(target === "quickapp-webview-huawei");
    expect(flags.isQuickappWebviewUnion).toBe(target === "quickapp-webview-union");
    expect(flags.isApp).toBe(false);
    expect(flags.isMp).toBe(false);
  });

  it.each(["h5", "unknown"])("does not classify %s as an App or mini-program", (target) => {
    const flags = platformFlags(target);
    expect(flags.isApp).toBe(false);
    expect(flags.isMp).toBe(false);
    expect(flags.isQuickappWebview).toBe(false);
    expect(flags.isWeb).toBe(target === "h5");
    expect(flags.isOtherPlatform).toBe(target === "unknown");
  });
});