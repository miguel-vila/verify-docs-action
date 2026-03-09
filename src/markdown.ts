import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";
import { debug } from "./log.js";

const md = new MarkdownIt();

function extractLinks(source: string, filePath: string, repoDir: string): string[] {
  debug(`Extracting links from: ${filePath}`);
  const tokens = md.parse(source, {});
  const links: string[] = [];

  function walk(tokens: Token[]): void {
    for (const token of tokens) {
      if (token.type === "inline" && token.children) walk(token.children);
      if (token.type === "link_open") {
        const href = token.attrGet("href");
        if (!href || /^(https?:|mailto:|#)/.test(href)) continue;
        const clean = href.split("#")[0];
        if (!clean) continue;
        const fileDir = dirname(filePath);
        const resolved = resolve(repoDir, fileDir, clean);
        if (!existsSync(resolved)) continue;
        links.push(relative(repoDir, resolved));
      }
      if (token.children) walk(token.children);
    }
  }

  walk(tokens);
  debug(`Found ${links.length} links in ${filePath}: ${links.join(", ") || "(none)"}`);
  return links;
}

export async function collectFiles(repoDir: string, seeds: string[]): Promise<string[]> {
  debug(`collectFiles starting with seeds: ${seeds.join(", ")}`);
  const visited = new Set<string>();
  const queue = [...seeds];
  const files: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) {
      debug(`Skipping already visited: ${current}`);
      continue;
    }
    visited.add(current);

    const fullPath = join(repoDir, current);
    if (!existsSync(fullPath)) {
      debug(`File does not exist: ${fullPath}`);
      continue;
    }
    debug(`Processing file: ${current}`);
    files.push(current);

    const source = await readFile(fullPath, "utf-8");
    for (const link of extractLinks(source, current, repoDir)) {
      if (!visited.has(link)) {
        debug(`Queuing linked file: ${link}`);
        queue.push(link);
      }
    }
  }

  debug(`collectFiles complete, found ${files.length} files`);
  return files;
}
