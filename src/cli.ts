import { parseArgs } from "node:util";
import * as core from "@actions/core";

export interface CliArgs {
  repoDir: string;
  verifyOnly: boolean;
  verbose: boolean;
  model: string;
  include: string[];
}

const HELP = `Usage: verify-docs-action [options] [repo_dir]

Options:
  --verify-only      Only verify docs, skip fix & PR phase
  --include <file>   Additional files to verify (can be repeated)
  -v, --verbose      Log turn numbers, tool calls, and token usage to stderr
  -m, --model <id>   Anthropic model to use (default: claude-haiku-4-5-20251001)
  -h, --help         Show this help message

Arguments:
  repo_dir           Repository root (defaults to cwd)

Environment:
  ANTHROPIC_API_KEY  Required. API key for the Anthropic SDK.

GitHub Action Inputs:
  include            Space-separated list of files to check
  verify-only        Only verify, do not create fix PRs (true/false)
  verbose            Enable verbose logging (true/false)
  model              Anthropic model to use`;

function isGitHubAction(): boolean {
  return process.env.GITHUB_ACTIONS === "true";
}

function parseGitHubActionInputs(): CliArgs {
  const include = core.getInput("include");
  const verifyOnly = core.getInput("verify-only") === "true";
  const verbose = core.getInput("verbose") === "true";
  const model = core.getInput("model") || "claude-haiku-4-5-20251001";

  // In GitHub Actions, GITHUB_WORKSPACE is the repo checkout
  const repoDir = process.env.GITHUB_WORKSPACE ?? process.cwd();

  return {
    repoDir,
    verifyOnly,
    verbose,
    model,
    include: include ? include.split(/\s+/).filter(Boolean) : [],
  };
}

function parseCliArgs(): CliArgs {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "verify-only": { type: "boolean", default: false },
      include: { type: "string", multiple: true, default: [] },
      verbose: { type: "boolean", short: "v", default: false },
      model: { type: "string", short: "m", default: "claude-haiku-4-5-20251001" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  return {
    repoDir: positionals[0] ?? process.cwd(),
    verifyOnly: values["verify-only"] ?? false,
    verbose: values.verbose ?? false,
    model: values.model ?? "claude-haiku-4-5-20251001",
    include: (values.include ?? []) as string[],
  };
}

export function parseCli(): CliArgs {
  if (isGitHubAction()) {
    return parseGitHubActionInputs();
  }
  return parseCliArgs();
}

export { isGitHubAction };
