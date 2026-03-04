import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock @actions/core before importing cli module
vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
}));

import { parseCli, isGitHubAction } from "./cli.js";
import * as core from "@actions/core";

describe("isGitHubAction", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true when GITHUB_ACTIONS is 'true'", () => {
    process.env = { ...originalEnv, GITHUB_ACTIONS: "true" };
    expect(isGitHubAction()).toBe(true);
  });

  it("returns false when GITHUB_ACTIONS is not set", () => {
    process.env = { ...originalEnv };
    delete process.env.GITHUB_ACTIONS;
    expect(isGitHubAction()).toBe(false);
  });

  it("returns false when GITHUB_ACTIONS is 'false'", () => {
    process.env = { ...originalEnv, GITHUB_ACTIONS: "false" };
    expect(isGitHubAction()).toBe(false);
  });
});

describe("parseCli — CLI mode", () => {
  const originalEnv = process.env;
  const originalArgv = process.argv;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GITHUB_ACTIONS;
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
  });

  it("returns defaults when no args provided", () => {
    process.argv = ["node", "cli.js"];
    const args = parseCli();
    expect(args.verifyOnly).toBe(false);
    expect(args.verbose).toBe(false);
    expect(args.model).toBe("claude-haiku-4-5-20251001");
    expect(args.include).toEqual([]);
    expect(args.repoDir).toBe(process.cwd());
  });

  it("parses --verify-only flag", () => {
    process.argv = ["node", "cli.js", "--verify-only"];
    const args = parseCli();
    expect(args.verifyOnly).toBe(true);
  });

  it("parses --verbose / -v flag", () => {
    process.argv = ["node", "cli.js", "-v"];
    const args = parseCli();
    expect(args.verbose).toBe(true);
  });

  it("parses --model / -m option", () => {
    process.argv = ["node", "cli.js", "-m", "claude-sonnet-4-5-20250929"];
    const args = parseCli();
    expect(args.model).toBe("claude-sonnet-4-5-20250929");
  });

  it("parses --include with multiple values", () => {
    process.argv = [
      "node",
      "cli.js",
      "--include",
      "extra.md",
      "--include",
      "other.md",
    ];
    const args = parseCli();
    expect(args.include).toEqual(["extra.md", "other.md"]);
  });

  it("parses positional repo directory", () => {
    process.argv = ["node", "cli.js", "/my/repo"];
    const args = parseCli();
    expect(args.repoDir).toBe("/my/repo");
  });

  it("parses all flags together", () => {
    process.argv = [
      "node",
      "cli.js",
      "--verify-only",
      "-v",
      "-m",
      "my-model",
      "--include",
      "a.md",
      "/some/path",
    ];
    const args = parseCli();
    expect(args.verifyOnly).toBe(true);
    expect(args.verbose).toBe(true);
    expect(args.model).toBe("my-model");
    expect(args.include).toEqual(["a.md"]);
    expect(args.repoDir).toBe("/some/path");
  });
});

describe("parseCli — GitHub Action mode", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GITHUB_ACTIONS: "true",
      GITHUB_WORKSPACE: "/workspace/repo",
    };
    vi.mocked(core.getInput).mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns defaults for empty inputs", () => {
    vi.mocked(core.getInput).mockReturnValue("");
    const args = parseCli();
    expect(args.verifyOnly).toBe(false);
    expect(args.verbose).toBe(false);
    expect(args.model).toBe("claude-haiku-4-5-20251001");
    expect(args.include).toEqual([]);
    expect(args.repoDir).toBe("/workspace/repo");
  });

  it("parses verify-only input", () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === "verify-only") return "true";
      return "";
    });
    const args = parseCli();
    expect(args.verifyOnly).toBe(true);
  });

  it("parses verbose input", () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === "verbose") return "true";
      return "";
    });
    const args = parseCli();
    expect(args.verbose).toBe(true);
  });

  it("parses model input", () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === "model") return "claude-opus-4-6";
      return "";
    });
    const args = parseCli();
    expect(args.model).toBe("claude-opus-4-6");
  });

  it("parses space-separated include input", () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === "include") return "docs/a.md docs/b.md";
      return "";
    });
    const args = parseCli();
    expect(args.include).toEqual(["docs/a.md", "docs/b.md"]);
  });

  it("uses GITHUB_WORKSPACE as repoDir", () => {
    vi.mocked(core.getInput).mockReturnValue("");
    const args = parseCli();
    expect(args.repoDir).toBe("/workspace/repo");
  });
});
