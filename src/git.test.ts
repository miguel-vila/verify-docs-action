import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  branchExists,
  createBranch,
  commitAllChanges,
  restoreMainBranch,
  deleteBranch,
  hasChanges,
} from "./git.js";

describe("git operations", () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "verify-docs-git-test-"));
    // Initialize a real git repo for integration tests
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: repoDir });
    execFileSync("git", ["config", "user.email", "test@test.com"], {
      cwd: repoDir,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repoDir });
    writeFileSync(join(repoDir, "README.md"), "# Test");
    execFileSync("git", ["add", "."], { cwd: repoDir });
    execFileSync("git", ["commit", "-m", "initial"], { cwd: repoDir });
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  describe("branchExists", () => {
    it("returns true for an existing branch", () => {
      expect(branchExists(repoDir, "main")).toBe(true);
    });

    it("returns false for a non-existent branch", () => {
      expect(branchExists(repoDir, "does-not-exist")).toBe(false);
    });
  });

  describe("createBranch", () => {
    it("creates a new branch and switches to it", () => {
      createBranch(repoDir, "feature/test");
      const current = execFileSync("git", ["branch", "--show-current"], {
        cwd: repoDir,
        encoding: "utf-8",
      }).trim();
      expect(current).toBe("feature/test");
    });

    it("recreates an existing branch (deletes then creates)", () => {
      createBranch(repoDir, "my-branch");
      // Make a commit on the branch
      writeFileSync(join(repoDir, "file.txt"), "content");
      execFileSync("git", ["add", "."], { cwd: repoDir });
      execFileSync("git", ["commit", "-m", "on branch"], { cwd: repoDir });

      // Go back to main
      execFileSync("git", ["checkout", "main"], { cwd: repoDir });

      // Recreate the branch — should not fail
      createBranch(repoDir, "my-branch");
      const current = execFileSync("git", ["branch", "--show-current"], {
        cwd: repoDir,
        encoding: "utf-8",
      }).trim();
      expect(current).toBe("my-branch");
    });
  });

  describe("hasChanges", () => {
    it("returns false on a clean repo", () => {
      expect(hasChanges(repoDir)).toBe(false);
    });

    it("returns true when a file is modified", () => {
      writeFileSync(join(repoDir, "README.md"), "# Modified");
      expect(hasChanges(repoDir)).toBe(true);
    });

    it("returns true when a new file is added", () => {
      writeFileSync(join(repoDir, "new-file.txt"), "new");
      expect(hasChanges(repoDir)).toBe(true);
    });
  });

  describe("commitAllChanges", () => {
    it("commits all changes with the given message", () => {
      writeFileSync(join(repoDir, "file.txt"), "content");
      commitAllChanges(repoDir, "add file");

      const log = execFileSync("git", ["log", "--oneline", "-1"], {
        cwd: repoDir,
        encoding: "utf-8",
      }).trim();
      expect(log).toContain("add file");
      expect(hasChanges(repoDir)).toBe(false);
    });
  });

  describe("restoreMainBranch", () => {
    it("switches back to main branch", () => {
      createBranch(repoDir, "other-branch");
      restoreMainBranch(repoDir);

      const current = execFileSync("git", ["branch", "--show-current"], {
        cwd: repoDir,
        encoding: "utf-8",
      }).trim();
      expect(current).toBe("main");
    });
  });

  describe("deleteBranch", () => {
    it("deletes a branch", () => {
      createBranch(repoDir, "to-delete");
      restoreMainBranch(repoDir);
      deleteBranch(repoDir, "to-delete");

      expect(branchExists(repoDir, "to-delete")).toBe(false);
    });

    it("throws when deleting a non-existent branch", () => {
      expect(() => deleteBranch(repoDir, "nope")).toThrow();
    });
  });
});
