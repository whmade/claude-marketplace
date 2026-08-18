# Changelog

The `workflows` plugin is unversioned - every commit to `main` ships to consumers - so this file is how users see what changed, especially breaking changes.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Skills now track their Definition-of-done checklist with Claude Code's Task tools (`TaskCreate`/`TaskUpdate`/`TaskList`) instead of the legacy `TodoWrite`. On Opus 4.8, Sonnet 5, Fable 5, and later these tools are opt-in: set `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` in `.claude/settings.json` (see the README) or the skills have no task tool to build their checklist with.

### Added
- Initial `workflows` plugin with three skills distilled from the copies that had drifted across `whme/` and `whmade/` repos:
  - `commit` - repo-aware commit messages with the mandatory `Co-authored-by` trailer.
  - `github-pr` - create or update PRs and reply-then-resolve every comment.
  - `scrutinize` - self-review pass over a PR, commit, range, or working changes, with a Definition-of-done checklist.
- Conventions contract: skills read `## Code style`, `## Testing`, `## Commit conventions`, and `## Pull requests` from a consuming repo's `AGENTS.md`/`CLAUDE.md`, falling back to auto-detected defaults.
- MIT license, with `license` fields in the manifests and an `SPDX-License-Identifier` header in each skill so it travels with copied-out files.
