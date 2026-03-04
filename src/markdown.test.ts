import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectFiles } from "./markdown.js";

describe("collectFiles", () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "verify-docs-test-"));
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("returns a single seed file with no links", async () => {
    writeFileSync(join(repoDir, "CLAUDE.md"), "# Hello\nNo links here.");

    const files = await collectFiles(repoDir, ["CLAUDE.md"]);
    expect(files).toEqual(["CLAUDE.md"]);
  });

  it("follows a direct markdown link", async () => {
    writeFileSync(
      join(repoDir, "CLAUDE.md"),
      "# Root\nSee [guide](docs/guide.md) for details.",
    );
    mkdirSync(join(repoDir, "docs"));
    writeFileSync(join(repoDir, "docs/guide.md"), "# Guide\nSome content.");

    const files = await collectFiles(repoDir, ["CLAUDE.md"]);
    expect(files).toEqual(["CLAUDE.md", "docs/guide.md"]);
  });

  it("follows transitive links (A -> B -> C)", async () => {
    writeFileSync(join(repoDir, "a.md"), "Link to [b](b.md).");
    writeFileSync(join(repoDir, "b.md"), "Link to [c](c.md).");
    writeFileSync(join(repoDir, "c.md"), "End of chain.");

    const files = await collectFiles(repoDir, ["a.md"]);
    expect(files).toEqual(["a.md", "b.md", "c.md"]);
  });

  it("does not visit the same file twice (handles cycles)", async () => {
    writeFileSync(join(repoDir, "a.md"), "Link to [b](b.md).");
    writeFileSync(join(repoDir, "b.md"), "Link back to [a](a.md).");

    const files = await collectFiles(repoDir, ["a.md"]);
    expect(files).toEqual(["a.md", "b.md"]);
  });

  it("ignores external http links", async () => {
    writeFileSync(
      join(repoDir, "doc.md"),
      "See [Google](https://google.com) and [guide](guide.md).",
    );
    writeFileSync(join(repoDir, "guide.md"), "Guide content.");

    const files = await collectFiles(repoDir, ["doc.md"]);
    expect(files).toEqual(["doc.md", "guide.md"]);
  });

  it("ignores mailto links", async () => {
    writeFileSync(
      join(repoDir, "doc.md"),
      "Email [me](mailto:user@example.com).",
    );

    const files = await collectFiles(repoDir, ["doc.md"]);
    expect(files).toEqual(["doc.md"]);
  });

  it("ignores anchor-only links", async () => {
    writeFileSync(
      join(repoDir, "doc.md"),
      "Jump to [section](#section-name).",
    );

    const files = await collectFiles(repoDir, ["doc.md"]);
    expect(files).toEqual(["doc.md"]);
  });

  it("strips anchors from links before resolving", async () => {
    writeFileSync(
      join(repoDir, "doc.md"),
      "See [guide section](guide.md#setup).",
    );
    writeFileSync(join(repoDir, "guide.md"), "Guide.");

    const files = await collectFiles(repoDir, ["doc.md"]);
    expect(files).toEqual(["doc.md", "guide.md"]);
  });

  it("skips links to non-existent files", async () => {
    writeFileSync(
      join(repoDir, "doc.md"),
      "See [missing](missing.md) and [existing](existing.md).",
    );
    writeFileSync(join(repoDir, "existing.md"), "I exist.");

    const files = await collectFiles(repoDir, ["doc.md"]);
    expect(files).toEqual(["doc.md", "existing.md"]);
  });

  it("skips seed files that do not exist", async () => {
    writeFileSync(join(repoDir, "real.md"), "Real file.");

    const files = await collectFiles(repoDir, ["missing.md", "real.md"]);
    expect(files).toEqual(["real.md"]);
  });

  it("handles multiple seed files", async () => {
    writeFileSync(join(repoDir, "a.md"), "File A.");
    writeFileSync(join(repoDir, "b.md"), "File B links to [c](c.md).");
    writeFileSync(join(repoDir, "c.md"), "File C.");

    const files = await collectFiles(repoDir, ["a.md", "b.md"]);
    expect(files).toEqual(["a.md", "b.md", "c.md"]);
  });

  it("deduplicates files reached via multiple paths", async () => {
    writeFileSync(
      join(repoDir, "a.md"),
      "Links to [b](b.md) and [c](c.md).",
    );
    writeFileSync(join(repoDir, "b.md"), "Links to [c](c.md).");
    writeFileSync(join(repoDir, "c.md"), "Shared target.");

    const files = await collectFiles(repoDir, ["a.md"]);
    expect(files).toEqual(["a.md", "b.md", "c.md"]);
  });

  it("resolves relative paths in subdirectories", async () => {
    mkdirSync(join(repoDir, "docs"));
    mkdirSync(join(repoDir, "docs/nested"));
    writeFileSync(
      join(repoDir, "CLAUDE.md"),
      "See [overview](docs/overview.md).",
    );
    writeFileSync(
      join(repoDir, "docs/overview.md"),
      "See [deep](nested/deep.md).",
    );
    writeFileSync(join(repoDir, "docs/nested/deep.md"), "Deep doc.");

    const files = await collectFiles(repoDir, ["CLAUDE.md"]);
    expect(files).toEqual([
      "CLAUDE.md",
      "docs/overview.md",
      "docs/nested/deep.md",
    ]);
  });

  it("handles multiple links in the same file", async () => {
    writeFileSync(
      join(repoDir, "doc.md"),
      [
        "# Doc",
        "See [a](a.md) for one thing.",
        "And [b](b.md) for another.",
        "Also [c](c.md).",
      ].join("\n"),
    );
    writeFileSync(join(repoDir, "a.md"), "A");
    writeFileSync(join(repoDir, "b.md"), "B");
    writeFileSync(join(repoDir, "c.md"), "C");

    const files = await collectFiles(repoDir, ["doc.md"]);
    expect(files).toEqual(["doc.md", "a.md", "b.md", "c.md"]);
  });

  it("returns empty array when all seeds are missing", async () => {
    const files = await collectFiles(repoDir, ["nope.md", "also-nope.md"]);
    expect(files).toEqual([]);
  });
});
