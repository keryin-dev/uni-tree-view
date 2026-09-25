import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertReleaseCommit, getReleaseInfo } from "../scripts/release";

function versions(version = "1.0.0") {
  return { ".": version, "packages/core": version, playground: version, docs: version };
}

describe("release validation", () => {
  it("shares the complete non-releasing checks with release preparation", () => {
    const { scripts } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };
    // 完整校验的步骤清单由 run-checks.test.ts 断言。
    expect(scripts["check:all"]).toBe("tsx scripts/run-checks.ts --all");
    expect(scripts["release:prepare"])
      .toBe("pnpm changelog:generate && pnpm changelog:promote && pnpm check:all");
  });
});

describe("release identity", () => {
  it("pins the stable release to one versioned artifact", () => {
    expect(getReleaseInfo("v1.0.0", versions())).toEqual({
      version: "1.0.0",
      prerelease: false,
      npmTag: "latest",
      artifact: "artifacts/npm/uni-tree-view-1.0.0.tgz"
    });
  });

  it("keeps pre-releases out of npm latest", () => {
    expect(getReleaseInfo("v1.0.0-rc.1", versions("1.0.0-rc.1"))).toMatchObject({
      prerelease: true,
      npmTag: "next"
    });
  });

  it.each(["main", "1.0.0", "v0.6.4", "v1.0.0\nartifact=other"])("rejects a wrong or unsafe tag: %s", (tag) => {
    expect(() => getReleaseInfo(tag, versions())).toThrow("Expected release tag");
  });

  it.each([".", "playground", "docs"])("detects an unsynchronized %s version", (name) => {
    expect(() => getReleaseInfo("v1.0.0", { ...versions(), [name]: "0.6.4" }))
      .toThrow("does not match");
  });

  it("requires the tag commit, not a same-named branch", () => {
    expect(() => assertReleaseCommit("head", "tag", true)).toThrow("same-named branch");
  });

  it("requires the release commit to be on main", () => {
    expect(() => assertReleaseCommit("tag", "tag", false)).toThrow("origin/main");
    expect(() => assertReleaseCommit("tag", "tag", true)).not.toThrow();
  });
});