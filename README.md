# verify-docs-action

A GitHub Action (and CLI tool) that verifies documentation is in sync with your codebase using Claude AI.

## How It Works

1. Starts from `CLAUDE.md` and recursively follows markdown links to build the full set of documentation files
2. Uses Claude to verify each doc against the actual codebase (file paths, module names, patterns, etc.)
3. Optionally creates PRs to fix any outdated documentation

## Usage as GitHub Action

```yaml
name: Verify Docs

on:
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Mondays
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: miguel-vila/verify-docs-action@releases/v1
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          # Optional: check additional files
          include: 'README.md CONTRIBUTING.md'
          # Optional: only verify, don't create fix PRs
          verify-only: 'false'
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `include` | Space-separated list of additional files to check | No | `''` |
| `verify-only` | Only verify docs, don't create fix PRs | No | `'false'` |
| `verbose` | Enable verbose logging | No | `'false'` |
| `model` | Anthropic model to use | No | `'claude-haiku-4-5-20251001'` |
| `anthropic-api-key` | Anthropic API key | No | Uses `ANTHROPIC_API_KEY` env var |
| `github-token` | GitHub token for creating PRs | No | Uses `GITHUB_TOKEN` env var |

### Outputs

| Output | Description |
|--------|-------------|
| `files-checked` | Number of documentation files checked |
| `files-outdated` | Number of files found to be outdated |
| `prs-created` | Number of PRs created |
| `pr-urls` | Newline-separated list of PR URLs |
| `results-dir` | Path to detailed verification results |

## Usage as CLI

```bash
# Install
npm install -g verify-docs-action

# Or run directly with npx
npx verify-docs-action [options] [repo_dir]

# Options
#   --verify-only      Only verify, don't fix
#   --include <file>   Additional files to check (repeatable)
#   -v, --verbose      Verbose logging
#   -m, --model <id>   Anthropic model to use
#   -h, --help         Show help
```

## Requirements

- Repository must have a `CLAUDE.md` file
- `ANTHROPIC_API_KEY` environment variable (or input)
- For PR creation: `gh` CLI must be authenticated (automatic in GitHub Actions)

## How Documentation is Discovered

The tool uses transitive closure:

1. Starts with `CLAUDE.md` (and any files specified via `--include`)
2. Parses each markdown file for local links (e.g., `[Architecture](./ARCHITECTURE.md)`)
3. Adds linked files to the queue
4. Continues until all reachable documentation is discovered

External links (http://, mailto:, etc.) and anchors (#) are ignored.

## Development

```bash
# Install dependencies
npm install

# Run locally
npm start -- --verify-only /path/to/repo

# Type check
npm run typecheck

# Build the bundle
npm run build
```

## Releasing

1. Update version in `package.json`
2. Create and push a tag: `git tag v1.0.0 && git push origin v1.0.0`
3. The release workflow will:
   - Build the action bundle
   - Push to `releases/v1.0.0` branch (exact version)
   - Push to `releases/v1` branch (major version)
   - Create a GitHub Release

Users can then reference:
- `@releases/v1` - always gets latest v1.x.x (recommended)
- `@releases/v1.0.0` - pinned to exact version

## License

MIT
