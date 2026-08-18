---
# SPDX-License-Identifier: MIT
name: scrutinize
description: Self-review pass that critically challenges, tightens, verifies, and publishes a change. Takes a GitHub PR, a commit, a git range, or empty for the current working changes. Use this whenever the user asks to scrutinize, self-review, review, or clean up a change before committing or pushing.
argument-hint: "GH PR <number> | commit-id | git-ref-or-range | empty for working changes"
---

You are a senior software development expert with years of experience.

## How to run this skill (read first)

The mechanical half (rebasing, resolving threads, committing, pushing) is the part that gets skipped once the review reads well.
The run is complete only when every applicable **Definition of done** item is checked with the evidence it names.

- First, turn the applicable **Definition of done** items into a task list with the Task tools (`TaskCreate` per item, `TaskUpdate` to change status) — drop what does not apply, e.g. no PR-thread step for a plain commit — and keep it current; never mark an item done without its evidence.
- To commit, create a PR, or answer threads, follow the sibling skill ([`../commit/SKILL.md`](../commit/SKILL.md), [`../github-pr/SKILL.md`](../github-pr/SKILL.md)) rather than hand-rolling a message or reply from memory.
- This skill is project-agnostic: read this repo's `AGENTS.md`/`CLAUDE.md` early for stack-specific commands and conventions, and honor them throughout.

## 1. Resolve the target

Resolve `$ARGUMENTS` to the exact set of changes, picking the single matching case:

- A GitHub PR reference like `GH PR 12` -> take the number `N`, get the diff with `gh pr diff N` and the metadata with `gh pr view N --json number,title,body,state,headRefName,baseRefName,headRepositoryOwner,headRepository,maintainerCanModify,url,author,files,commits,labels`.
  Do NOT use a bare `gh pr view N`: its default view fetches classic project cards and fails with a "Projects (classic) is being deprecated" GraphQL error.
- A commit hash -> `git show <hash>`.
- A range or ref (e.g. `main..HEAD`, `HEAD~3`) -> `git diff <range-or-ref>`.
- Empty -> the current uncommitted changes (`git diff` unstaged, `git diff --cached` staged).

Run `git fetch origin` before resolving any committed target so you scrutinize current state, not a stale checkout.

## 2. Put the PR code current in THIS worktree (PR / branch targets)

Skip the checkout below for a plain commit hash, a range, or empty working changes - but first confirm the target is contained in the current branch (`git branch --contains <hash>` for a commit, `git merge-base --is-ancestor <end-ref> HEAD` for a range), so your edits and the section-9 publish act on the reviewed commits and not an unrelated HEAD; if it is not contained, stop and ask the user.
For a PR or branch target, edit the actual code, not the tip of whatever branch is checked out:

- NEVER `cd` into another worktree, even if `git worktree list` shows the PR branch checked out elsewhere - those are separate workspaces.
- Record the current branch (`git rev-parse --abbrev-ref HEAD`) so you can return to it at the end.
- Check out the PR head as a DETACHED HEAD here: `gh pr checkout N --detach` (detaching is what lets this work when the branch is checked out elsewhere), or without `gh`: `git fetch origin pull/N/head` then `git checkout --detach FETCH_HEAD`.
- Spot-check that one changed file already contains the PR's changes; if it shows old code, you are not on the PR code - fix that.

**Rebase onto the PR's base branch**, unless this repo's `## Pull requests` conventions prefer merge commits.
A `--force-with-lease` push to the PR's own branch records a force-push event on the PR timeline with a compare link, keeping the patchset-to-patchset diff visible to the reviewer.

- Rebase onto `origin/<baseRefName>` from the `gh pr view --json` metadata, NOT a hardcoded `origin/main` - a PR may target a maintenance/release branch.
- `git rebase origin/<baseRefName>`, resolving conflicts properly - do not `--abort` or `--skip` to make the work vanish.
- Rebasing also lets you scrutinize the code as it will look merged, catching conflicts and semantic drift against the current base.
- The rebase and your scrutiny edits go up together as one patchset in the publish step; do not force-push here.

## 3. Read and understand before touching anything

Read the resolved diff in full, plus all supporting material: any linked issue, existing PR/commit comments, and related discussion.
Then read the surrounding code so a "simpler" rewrite stays correct, and honor `AGENTS.md`/`CLAUDE.md`.
Research current best practices online for what the change is trying to do, so each decision below is well founded.

## 4. Answer every unresolved review thread (PR targets)

For a PR, follow [`../github-pr/SKILL.md`](../github-pr/SKILL.md) to REPLY to and RESOLVE each unresolved thread, not merely read them.
Record how many threads you closed; that count is the evidence for this step.

## 5. Judge correctness

Reason through correctness against the surrounding code and the project's domain notes in `AGENTS.md`/`CLAUDE.md`. Weigh, at least:

- **Assumptions that may not hold** - API shapes, invariants, or library behavior the change relies on.
  If an assumption cannot be confirmed from source or docs, say so - never present it as verified.
- **Error and edge cases** - empty/absent/malformed inputs, failure paths, and resources that must be released or guarded.
- **State and concurrency boundaries** - ordering, races, and reads/writes that cross a process/thread/replication boundary; moving work across such a boundary can be a bug even if it reads cleanly.
- **Behavior preserved** - the change does only what it intends, with no incidental regressions.

Where the project can be exercised, correctness is confirmed by the tests in section 8, not by reasoning alone.

## 6. Challenge every character the change adds

For each addition, ask - and then act:

- If it is not absolutely needed, remove it.
- If it can be done more simply, make it simpler.
- If it can be done more elegantly, make it more elegant.

Keep the result readable: no abbreviations, descriptive variable names, additions that stay legible.

**Comments and docstrings**, to a strict standard:

The default for every comment and every line of docstring prose is DELETE.
A comment earns its place only by explaining what the code cannot - a non-obvious quirk, an empirical reason, an invariant.

- A comment that restates, paraphrases, or narrates what the code does is noise, even when accurate - remove it.
- Delete comments that paraphrase the next line, narrate a step, restate a name, or banner a section, and docstring sentences the signature already conveys.
- A kept comment is at most one line and states the WHY the code cannot, never the WHAT it shows.
- Honor the repo's documentation standard: where `AGENTS.md`/`CLAUDE.md` or a linter mandates docstring structure, keep it but trim each entry; required docstrings are shortened, never removed.
- Hold existing comments and docstrings touched by the change to the same bar; do not grandfather them in.

Enforce the repo's punctuation rules (e.g. ASCII-only) from `## Commit conventions`; fix violations in the change.

Apply edits directly.
For each, state in one line what you challenged and the verdict (removed / simpler / more elegant / tightened).
If something is genuinely needed as-is, say so rather than invent a change.

## 7. Scrutinize the commit message and, for a PR, its description

### Commit message

Judge the message against [`../commit/SKILL.md`](../commit/SKILL.md): imperative subject within limits, body that explains WHY, repo punctuation honored, exactly one `Co-authored-by:` trailer.
Fix any failure in the publish step below, UNLESS the commit is already merged into `origin/main` - then flag it rather than rewrite published history.

### PR description and required artifacts (PR targets)

Follow [`../github-pr/SKILL.md`](../github-pr/SKILL.md) for the PR description format, then judge the PR metadata from section 1:

- **Title** follows the commit-subject rules (imperative, capitalized, no trailing period, no appended PR number, within length).
- **Body** explains WHY and how it was verified, carries no diff narration, and matches the commit body it was `--fill`ed from; flag any drift.
- **Repo-required PR artifacts** from `## Pull requests` (a changelog/news fragment, a required label).
  A missing file artifact is a repo file: add it HERE so the publish step carries it in the patchset; a missing label or title/body fix is a GitHub-side edit in the publish step.

For added tests, challenge each: necessary, adds value beyond existing coverage, cannot fold into another?
Drop redundant ones; add or extend a test when the change touches testable logic (see `AGENTS.md` for what the suite covers).

## 8. Verify

Verify with this repo's own checks.
Read the commands from `## Code style` and `## Testing` in `AGENTS.md`/`CLAUDE.md` and run them: formatter, linter, type-checker (with autofix where provided), test suite, and any changed-line coverage gate.

If the repo documents no commands, auto-detect from the project files and run the standard toolchain, for example:

- Rust (`Cargo.toml`): `cargo fmt`, `cargo clippy`, `cargo test`.
- Python (`pyproject.toml` with ruff): `ruff format`, `ruff check --fix`, the configured type-checker, `pytest`.
- Node (`package.json`): the project's `format`/`lint`/`typecheck`/`test` scripts.

If you cannot run a gate, reason through it, say so explicitly, and name anything that still needs manual or environment-specific verification.

## 9. Publish - do not strand the scrutiny locally

- **PR target:** commit code or message changes by following [`../commit/SKILL.md`](../commit/SKILL.md).
  The head branch lives on `headRepositoryOwner.login/headRepository.name` from the metadata: for a same-repo PR that is `origin`, but for a fork PR it is the contributor's fork - identify (and add if missing) that remote, and require `maintainerCanModify: true` before pushing to it.
  Push a patchset only when there is something to push - you committed edits, or the rebase advanced past the head branch's old tip; if the code was already clean and current, report it clean rather than push a no-op.
  Push to the head branch on that remote: `git push --force-with-lease <head-remote> HEAD:<headRefName>` (never plain `--force`, never a default branch).
  Then correct any drifted title/body with `gh pr edit <N> --title ... --body ...` and add any missing label with `gh pr edit <N> --add-label <label>`, without being asked.
  Finally `git checkout <original-branch>` and report the new commit hash and the force-push compare link.
- **Commit on a branch:** amend the scrutinized commit (`git commit --amend`, keeping the message unless you corrected it) rather than stacking a follow-up, then `git push` (force-push only if already pushed, confirming with the user first).
  Exception: resolve the repo's default branch (`git symbolic-ref --short refs/remotes/origin/HEAD`, or `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` - never assume `main`); if the commit is already merged into it (`git merge-base --is-ancestor <hash> <default-branch>` after `git fetch origin`), do NOT amend - tell the user and offer a history-rewriting force-push or a follow-up commit.
- **Range target (multiple commits):** publish on the current branch - amend the specific commit each edit belongs to (e.g. via an interactive rebase) or add a follow-up commit - then `git push`, using `--force-with-lease` only if the rewritten commits were already pushed and never onto the default branch. Never rewrite history already merged into the default branch.
- **Working changes (empty argument):** leave them staged/unstaged as you found them; do not commit unless asked.

## Definition of done

Turn the applicable items into your task list (`TaskCreate`/`TaskUpdate`) at the start; each must carry its evidence before you mark it completed.
Do not report success with any applicable box unchecked.

- [ ] Target resolved and `git fetch origin` run; evidence: which case, and the diff obtained.
- [ ] (PR/branch) PR head checked out DETACHED here and rebased onto `origin/<baseRefName>` (unless the repo prefers merge commits); evidence: rebase clean or conflicts resolved.
- [ ] Full diff, linked issue, and existing discussion read; best practices researched.
- [ ] (PR) Every unresolved thread replied to AND resolved via the `github-pr` skill; evidence: count closed (state 0 if none).
- [ ] Correctness judged on the section-5 points; evidence: one line each, or "n/a".
- [ ] Every added character challenged; unneeded code removed, rest simplified; evidence: the per-edit verdicts.
- [ ] Comments and docstring prose cut to the strict standard; repo punctuation enforced; evidence: what was cut, or "none to cut".
- [ ] Commit message checked against the `commit` skill and fixed if needed.
- [ ] (PR) PR title/description scrutinized against the `github-pr` format and corrected if drifted; repo-required artifacts present; evidence: conforms as-is / what was fixed.
- [ ] Verification done: repo `## Code style` + `## Testing` gates run (or auto-detected), or each reasoned through; manual checks named.
- [ ] Published: committed via the `commit` skill and, for a PR with something to push, force-with-lease pushed to `<headRefName>`, then returned to the original branch; evidence: the new commit hash and compare link, or "clean and current, nothing to push".
