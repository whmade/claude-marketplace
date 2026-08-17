# Changelog

The `workflows` plugin is unversioned - every commit to `main` ships to consumers - so this file is how users see what changed, especially breaking changes.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Initial `workflows` plugin with three skills distilled from the copies that had drifted across `whme/` and `whmade/` repos:
  - `commit` - repo-aware commit messages with the mandatory `Co-authored-by` trailer.
  - `github-pr` - create or update PRs and reply-then-resolve every comment.
  - `scrutinize` - self-review pass over a PR, commit, range, or working changes, with a Definition-of-done checklist.
- Conventions contract: skills read `## Code style`, `## Testing`, `## Commit conventions`, and `## Pull requests` from a consuming repo's `AGENTS.md`/`CLAUDE.md`, falling back to auto-detected defaults.
- MIT license, with `license` fields in the manifests and an `SPDX-License-Identifier` header in each skill so it travels with copied-out files.
