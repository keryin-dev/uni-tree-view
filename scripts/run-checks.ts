// @env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import chalk from "chalk";
import { getPnpmCommand } from "./pnpm-utils";

export interface CheckStep {
  title: string;
  command: string;
  args: string[];
}

const pnpm = (...args: string[]) => ({ command: "pnpm", args });

// git 在用户设置了 LESS 却不含 -F 时会用分页器显示空输出并停在 (END)，因此显式关闭分页器。
export const CheckSteps: CheckStep[] = [
  { title: "ESLint", ...pnpm("lint") },
  { title: "类型检查", ...pnpm("lint:type") },
  { title: "单元测试与覆盖率", ...pnpm("test:coverage") },
  { title: "组件构建产物", ...pnpm("check:build-output") },
  { title: "npm 分发内容", ...pnpm("check:package") },
  { title: "DCloud 插件打包", ...pnpm("pack:uni") },
  { title: "空白字符", command: "git", args: ["--no-pager", "diff", "--check"] }
];

export const FullCheckSteps: CheckStep[] = [
  ...CheckSteps,
  { title: "微信小程序构建", ...pnpm("-C", "playground", "build:mp-weixin") },
  { title: "支付宝小程序构建", ...pnpm("-C", "playground", "build:mp-alipay") },
  { title: "组件体积", ...pnpm("check:size") },
  { title: "文档站构建", ...pnpm("docs:build") }
];

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`;
}

export function runChecks(steps: CheckStep[]): boolean {
  const started = Date.now();
  const durations: number[] = [];
  for (const [index, step] of steps.entries()) {
    const label = `[${index + 1}/${steps.length}] ${step.title}`;
    const display = [step.command, ...step.args].join(" ");
    console.log(`\n${chalk.cyan.bold(`▶ ${label}`)} ${chalk.dim(display)}`);
    const stepStarted = Date.now();
    const command = step.command === "pnpm" ? getPnpmCommand(step.args) : { command: step.command, args: step.args };
    const result = spawnSync(command.command, command.args, { stdio: "inherit" });
    durations.push(Date.now() - stepStarted);
    if (result.error || result.status !== 0) {
      console.error(`\n${chalk.red.bold(`✖ ${label} 失败`)} ${chalk.dim(`(${formatDuration(durations[index])})`)}`);
      console.error(chalk.red(`已完成 ${index}/${steps.length} 步，后续步骤未执行。单独重跑：${display}`));
      return false;
    }
    console.log(chalk.green(`✔ ${label} ${chalk.dim(`(${formatDuration(durations[index])})`)}`));
  }
  console.log(`\n${chalk.green.bold(`全部 ${steps.length} 项检查通过`)} ${chalk.dim(`(总计 ${formatDuration(Date.now() - started)})`)}`);
  for (const [index, step] of steps.entries()) {
    console.log(chalk.dim(`  ${formatDuration(durations[index]).padStart(6)}  ${step.title}`));
  }
  return true;
}

// 导入函数做单元测试时不执行命令；只有直接运行此文件才启动检查。
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!runChecks(process.argv.includes("--all") ? FullCheckSteps : CheckSteps)) {
    process.exitCode = 1;
  }
}