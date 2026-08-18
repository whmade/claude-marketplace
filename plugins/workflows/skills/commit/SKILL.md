---
# SPDX-License-Identifier: MIT
name: commit
description: Write a git commit message following the repository's subject/body/trailer conventions, with the mandatory Co-authored-by trailer for AI-generated commits. Use this whenever creating a git commit or the user asks to commit, stage and commit, or record changes - always prefer it over an ad-hoc commit message.
---

# Commit Messages

Commit messages use the three-block layout: a single-line **subject**, an optional wrapped **body**, and a **footer** of Git trailers, each block separated by a blank line.

## First, read this repo's conventions

Check this repo's `AGENTS.md`/`CLAUDE.md` for a `## Commit conventions` section and follow it over the defaults below.
It typically pins:

- the **scope vocabulary** allowed as a `scope:` prefix,
- the **issue/PR reference style** (e.g. `GitHub: #<number>`),
- **punctuation constraints** (e.g. ASCII-only, no em-dashes or smart quotes).

Mirror the style in `git log`; do not invent scopes or trailers the repo does not use.
Absent any convention, the defaults below apply.

## Subject line

- Imperative mood. Capitalize the first word of an unscoped subject (`Add`, `Fix`, `Update`, `Remove`, `Refactor`, `Migrate`).
- Optional lowercase `scope:` prefix when the change is confined to one area (e.g. `client:`, `parser:`), using only scopes that match the code layout and existing `git log`; after the prefix, follow the casing `git log` uses (commonly lowercase, e.g. `client: handle zero-byte reads`).
- No trailing period; keep under 72 characters.
- Do not pre-append a PR number in parentheses (`(#165)`) - GitHub's squash-merge adds it when the PR lands.

## Body

- Separate the subject from the body with a blank line.
- Wrap lines at 72 characters.
- Explain **why** the change is made and the before/after behavior when relevant - not how, which the diff shows.
- Use `-` for bullet lists.
- Reference advisories/URLs inline when fixing CVEs or dependency alerts.

## Footer (trailers)

Trailers form a final block separated from the body by a blank line: issue/PR references first, then co-author trailers.

- **Issue/PR references**: one per line in the footer, never in the subject or body prose.
  If the change fully resolves a GitHub issue, use a closing reference `Closes #<number>` (keyword then `#`, no colon) so it closes automatically when the commit merges to the default branch.
  Otherwise use the repo's non-closing convention (default `GitHub: #<number>`).
- **AI co-authorship (MANDATORY for AI-generated commits)**: include a `Co-authored-by:` trailer naming the model in use:

  ```
  Co-authored-by: Claude Opus 4.6 <noreply@anthropic.com>
  ```

  - Name the exact model generating the commit (e.g. `Claude Opus 4.6`, `Claude Sonnet 4.6`); never hardcode a version.
  - Email must be `<noreply@anthropic.com>`.
  - Use lowercase `Co-authored-by:` (Git-canonical); it avoids duplicate trailers when tooling re-adds one.
  - Emit it exactly once - never two casings for the same author.

## Example

```
client: handle zero-byte pipe reads gracefully

Previously a partial read from the daemon's named pipe was treated as
an EOF and caused every client to exit. Distinguish between
`0 bytes read` (daemon gone) and `n>0 bytes read` (buffer not yet
complete) so large pastes no longer tear down the cluster.

GitHub: #142
Co-authored-by: Claude Opus 4.6 <noreply@anthropic.com>
```

## How to actually commit

Use a single-quoted heredoc (`<<'EOF'`) so backticks and `$` in the body are not expanded by the shell:

```sh
git add <paths>        # prefer explicit paths over `git add -A`
git commit -m "$(cat <<'EOF'
<subject line>

<wrapped body>

GitHub: #<N>
Co-authored-by: <Model Name> <noreply@anthropic.com>
EOF
)"
```

Never pass `--no-verify` or `--no-gpg-sign` unless the user explicitly asks.
If a pre-commit hook fails, fix the issue and create a new commit - do not `--amend` to "retry" a commit that never happened.

## Definition of done

Track these with the Task tools (`TaskCreate`/`TaskUpdate`); each must hold before the commit is done:

- [ ] Repo `## Commit conventions` read and honored (scopes, reference style, punctuation).
- [ ] Subject imperative, first word capitalized when unscoped, no trailing period, under 72 chars; body explains WHY, wrapped at 72.
- [ ] Footer references correct: `Closes #<n>` when the change fully resolves an issue, else the repo's non-closing style.
- [ ] Exactly ONE `Co-authored-by:` trailer naming the model in use - the most-forgotten item.
- [ ] No `--no-verify`, and no `--amend` to retry a hook-rejected commit (that never happened, so amend rewrites the PREVIOUS commit).
