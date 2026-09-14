// @env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const distDir = path.join(root, "docs", ".vitepress", "dist");
const siteBase = normalizeBase(process.env.DOCS_BASE ?? "/");
const demoHref = `${siteBase}ui/index.html`;
const demoIndex = path.join(distDir, "ui", "index.html");
const homePage = path.join(distDir, "index.html");
const examplesDir = path.join(root, "docs", "examples");

interface ExamplePage {
  name: string;
  scene: string;
}

function readExamplePages(): ExamplePage[] {
  return readdirSync(examplesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const filePath = path.join(examplesDir, entry.name);
      const source = readFileSync(filePath, "utf8");
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
      const demoLine = frontmatter
        ?.split(/\r?\n/)
        .find((line) => line.startsWith("demo:"));
      const rawScene = demoLine?.slice("demo:".length).trim();
      const scene = rawScene?.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
      if (!scene) {
        throw new Error(`Example page must declare a demo scene: ${path.relative(root, filePath)}`);
      }
      return {
        name: path.basename(entry.name, ".md"),
        scene
      };
    });
}

function normalizeBase(base: string): string {
  const withLeadingSlash = base.startsWith("/") ? base : `/${base}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function readRequired(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`Required docs build output is missing: ${path.relative(root, filePath)}`);
  }
  return readFileSync(filePath, "utf8");
}

function assertContains(filePath: string, content: string, expected: string): void {
  if (!content.includes(expected)) {
    throw new Error(`Expected ${path.relative(root, filePath)} to contain ${JSON.stringify(expected)}.`);
  }
}

function assertReferencedFileExists(reference: string): void {
  const withoutQuery = reference.split(/[?#]/, 1)[0];
  if (!withoutQuery.startsWith(siteBase)) {
    return;
  }

  const relativePath = withoutQuery.slice(siteBase.length);
  const filePath = path.resolve(distDir, relativePath);
  const relativeToDist = path.relative(distDir, filePath);
  if (relativeToDist.startsWith("..") || path.isAbsolute(relativeToDist)) {
    throw new Error(`Docs build contains an unsafe asset reference: ${reference}`);
  }
  if (!existsSync(filePath)) {
    throw new Error(`Docs build asset is missing for ${reference}: ${path.relative(root, filePath)}`);
  }
}

function checkHtmlReferences(filePath: string, content: string): void {
  const references = content.matchAll(/(?:src|href)="([^"]+)"/g);
  for (const match of references) {
    const reference = match[1];
    if (!reference || /^(?:[a-z]+:|#)/i.test(reference)) {
      continue;
    }
    assertReferencedFileExists(reference);
  }
}

const examplePages = readExamplePages();
const homeContent = readRequired(homePage);
const demoContent = readRequired(demoIndex);
assertContains(homePage, homeContent, demoHref);
assertContains(demoIndex, demoContent, `${siteBase}ui/assets/`);
checkHtmlReferences(demoIndex, demoContent);

for (const example of examplePages) {
  const filePath = path.join(distDir, "examples", `${example.name}.html`);
  const content = readRequired(filePath);
  assertContains(
    filePath,
    content,
    `${demoHref}#/pages/docs-preview/index?scene=${encodeURIComponent(example.scene)}`
  );
}

console.log(`Docs build check passed: ${demoHref} and ${examplePages.length} live previews are available.`);