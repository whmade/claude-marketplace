# Changelog

Notable changes to the `workflows` plugin, especially breaking ones, newest first.
The plugin is unversioned: its version is the commit SHA, and every commit on `main` reaches consumers on their next session.
Nothing is staged for a release, so there is no "unreleased" section - every entry below is already live.
Entries are append-only: once one lands it is never edited or deleted, and a change that supersedes an earlier one is added as a new entry, so the log keeps showing what consumers already ran.

## Track the Definition of done with the Task tools

The skills track their Definition-of-done checklist with Claude Code's Task tools (`TaskCreate`/`TaskUpdate`/`TaskList`) instead of the legacy `TodoWrite`.
On Opus 4.8, Sonnet 5, Fable 5, and later these tools are opt-in: without `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` in `.claude/settings.json` the session has no task tool and the skills cannot build their checklist.

## Add the `workflows` plugin

- Three skills distilled from the copies that had drifted across `whme/` and `whmade/` repos:
  - `commit` - repo-aware commit messages with the mandatory `Co-authored-by` trailer.
  - `github-pr` - create or update PRs and reply-then-resolve every comment.
  - `scrutinize` - self-review pass over a PR, commit, range, or working changes, with a Definition of done.
- Conventions contract: skills read `## Code style`, `## Testing`, `## Commit conventions`, and `## Pull requests` from a consuming repo's `AGENTS.md`/`CLAUDE.md`, falling back to auto-detected defaults.
- MIT license, with `license` fields in the manifests and an `SPDX-License-Identifier` header in each skill so it travels with copied-out files.
