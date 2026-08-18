---
# SPDX-License-Identifier: MIT
name: github-pr
description: Create, update, or review a GitHub pull request - open a PR, push updates to an existing one, and reply to and resolve every comment on it. Use this whenever the user asks to create/open a PR, update a PR, or address/respond to PR review feedback - always prefer it over ad-hoc gh commands.
---

# GitHub Pull Requests

Use this skill to **create** a new PR, **update** an existing one, or **respond to feedback** on a PR.
Treat the applicable **Definition of done** items as a hard gate and confirm each with the evidence it names before reporting done, so no comment is forgotten.

## First, read this repo's conventions

Check this repo's `AGENTS.md`/`CLAUDE.md` for a `## Pull requests` section and apply it on top of the flow below.
It typically pins extra `gh pr create` flags, required labels, or a changelog/news-fragment file the PR must add.

## Creating a PR

Create PRs from the commit message - do not re-author the prose in the PR form:

```sh
gh pr create --fill
```

`--fill` takes the title from the latest commit's subject and the body from its body, so a well-formed commit (see [`../commit/SKILL.md`](../commit/SKILL.md)) yields a well-formed PR.
Add any repo-required flags/labels from `## Pull requests`.

### PR description format

Hold the PR title and body to the same bar as the commit message:

- **Title** follows the commit-subject rules: imperative, capitalized, no trailing period, no appended PR number, under 72 chars.
- **Body** explains WHY and how the change was verified, carries no diff narration, and matches the commit body it was `--fill`ed from; flag any drift.

## Addressing feedback on an existing PR

A PR collects feedback in three places, and all of them count:

- **Inline review threads** - comments on specific lines, which carry a resolved/unresolved state.
- **Review summary comments** - the body a reviewer leaves when approving or requesting changes.
- **PR-level (issue) comments** - top-level comments on the conversation tab.

### Core rules

- **Respond to every piece of unaddressed feedback** from all three sources - even when the fix is "done in commit abc123".
- **Reply where the feedback lives**: an inline thread gets a threaded reply, a PR-level or review-summary comment gets a PR-level reply.
- **Resolve each inline thread only after** the fix is pushed and a reply is posted; PR-level comments have no resolve state.
- **Push to update the PR** - local commits alone do not count.
- No force-push to `main`, no `--no-verify`, and no `--amend` on commits already pushed for review (outside the `--force-with-lease` patchset flow the `scrutinize` skill describes).
- Commit per [`../commit/SKILL.md`](../commit/SKILL.md), including the mandatory `Co-authored-by:` trailer.

### Workflow (run these commands; substitute the placeholders in `<>`)

#### 1. Discover PR context

```sh
gh repo view --json owner --jq .owner.login   # <OWNER>
gh repo view --json name  --jq .name          # <REPO>
gh pr view  --json number --jq .number        # <N> for the current branch
# Or, if the PR number N was given explicitly, check it out:
gh pr checkout <N>
```

#### 2. Gather every piece of feedback

The REST endpoint `/pulls/:n/comments` does **not** expose thread resolution state, so use GraphQL for the inline threads and pull the review bodies and PR-level comments in the same query:

```sh
gh api graphql -f query='
  query($owner:String!,$name:String!,$number:Int!){
    repository(owner:$owner,name:$name){
      pullRequest(number:$number){
        reviewThreads(first:100){
          pageInfo{ hasNextPage endCursor }
          nodes{
            id isResolved isOutdated
            comments(first:50){
              pageInfo{ hasNextPage endCursor }
              nodes{ id databaseId author{login} path line body }
            }
          }
        }
        reviews(first:50){
          pageInfo{ hasNextPage endCursor }
          nodes{ id author{login} state body }
        }
        comments(first:100){
          pageInfo{ hasNextPage endCursor }
          nodes{ id databaseId author{login} body }
        }
      }
    }
  }' -F owner=<OWNER> -F name=<REPO> -F number=<N>
```

If any `pageInfo.hasNextPage` is `true`, request the next page with an `after: <endCursor>` argument on that connection (including a thread's nested `comments`) and merge the results before proceeding - never act on a truncated list.

Address each of:

- **`reviewThreads`** with `isResolved == false` - reply on the `databaseId` of the **first** comment (step 4), then resolve via the thread `id` (step 5).
- **`reviews`** with a non-empty `body` - handle the requested change and reply at PR level (step 4) for points not covered by an inline thread.
- **`comments`** (PR-level) still expecting an answer - reply at PR level (step 4); these have no resolve state.

#### 3. Make the code changes, commit, push

Commit per [`../commit/SKILL.md`](../commit/SKILL.md), then push:

```sh
git push                                           # already-tracked branch
git push -u origin "$(git branch --show-current)"  # first push of a new branch
```

Capture the commit SHA (`git rev-parse HEAD`) to reference in your replies.

#### 4. Reply to each piece of feedback, in the right place

**Inline review thread** - reply to the **first** comment in the thread (its `databaseId` from step 2); GitHub threads your reply underneath:

```sh
gh api --method POST \
  repos/<OWNER>/<REPO>/pulls/<N>/comments/<COMMENT_DATABASE_ID>/replies \
  -f body='Fixed in <SHA>. <optional short explanation>.'
```

**Review summary or PR-level (issue) comment** - reply at PR level:

```sh
gh pr comment <N> --body 'Addressed in <SHA>: <short explanation>.'
```

Do **not** answer an inline thread with `gh pr comment` (it will not thread under the review comment), and do not try to "resolve" a PR-level comment.

#### 5. Resolve each thread

Use the thread node `id` from step 2 (the GraphQL `id`, **not** `databaseId`):

```sh
gh api graphql -f query='
  mutation($threadId:ID!){
    resolveReviewThread(input:{threadId:$threadId}){
      thread{ id isResolved }
    }
  }' -F threadId=<THREAD_NODE_ID>
```

#### 6. Verify

Re-run the step-2 query.
Every inline thread you addressed should now be `isResolved: true`, and every review summary and PR-level comment should have a reply.
Anything still open needs a fix or was intentionally deferred - never silently skip one.

### Anti-patterns

- Leaving a review-summary or PR-level comment unanswered because it was not an inline thread.
- Posting a top-level PR comment instead of threading the reply on an inline review comment, or the reverse.
- Resolving without replying, or replying without resolving.
- Pushing before committing per [`../commit/SKILL.md`](../commit/SKILL.md), skipping the mandatory `Co-authored-by:` trailer.
- Force-pushing to shared branches to "clean up history" mid-review.
- Using `--amend` on commits already pushed (outside the `--force-with-lease` patchset flow).

## Definition of done

Confirm each applicable item below with the evidence it names before you report the PR done.

Creating a PR:

- [ ] Repo `## Pull requests` conventions read; required flags, labels, and files added.
- [ ] PR created with `gh pr create --fill`; title and body meet the format above.

Updating / addressing feedback:

- [ ] All feedback gathered from inline threads, review summaries, and PR-level comments (step 2).
- [ ] Changes committed per the `commit` skill and pushed (step 3); evidence: the pushed SHA.
- [ ] Every piece of feedback replied to in the right place (step 4).
- [ ] Every inline thread resolved after its reply (step 5); evidence: count resolved.
- [ ] Re-checked: no unresolved thread and no unanswered comment remains (step 6).
