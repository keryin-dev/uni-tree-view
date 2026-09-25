import { describe, expect, it } from "vitest";
import { CheckSteps, FullCheckSteps } from "../scripts/run-checks";

describe("run-checks", () => {
  it("runs every regular check before the platform, size and docs checks", () => {
    expect(FullCheckSteps.slice(0, CheckSteps.length)).toEqual(CheckSteps);
    expect(FullCheckSteps.slice(CheckSteps.length).map((step) => step.args[step.args.length - 1]))
      .toEqual(["build:mp-weixin", "build:mp-alipay", "check:size", "docs:build"]);
  });

  it("keeps git from opening a pager that waits for input", () => {
    const git = CheckSteps.find((step) => step.command === "git");
    expect(git?.args).toEqual(["--no-pager", "diff", "--check"]);
  });
});