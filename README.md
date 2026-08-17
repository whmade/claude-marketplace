# whmade Claude marketplace

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) and the single source of truth for the development-workflow skills shared across [`whme/`](https://github.com/whme) and [`whmade/`](https://github.com/whmade) repos.
Add it once per repo; the skills then stay in sync instead of being copy-pasted and drifting.

It ships one plugin, **`workflows`**, bundling three skills:

| Skill | What it does |
|-------|--------------|
| `/workflows:commit` | Write a commit message in the repo's conventions, with the mandatory `Co-authored-by` trailer. |
| `/workflows:github-pr` | Create or update a PR, and reply to and resolve every comment on it. |
| `/workflows:scrutinize` | Self-review a PR, commit, range, or working changes, then publish. |

## Using it in a repo

Enable it for everyone on a repo by committing this to its `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "whmade": {
      "source": { "source": "github", "repo": "whmade/claude-marketplace" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "workflows@whmade": true }
}
```

The plugin is a relative-path source inside this repo, so it installs with no extra step once a teammate trusts the folder.
Updates apply on the next launch or `/reload-plugins`.
A repo's own bare `/commit` in `.claude/skills/` coexists with the namespaced plugin skill; delete the local copy once migrated.

## The conventions contract (how repos specialize the skills)

The skills are generic; each repo tailors them by documenting its specifics in `AGENTS.md` or `CLAUDE.md`.
The skills read these sections and fall back to auto-detected defaults when a section is absent.
The marketplace defines the sections; each repo provides the concrete variant.

- `## Code style` - format, lint, and type-check commands (and any autofix runner); documentation standards.
- `## Testing` - the test command and any changed-line coverage gate.
- `## Commit conventions` - scope prefixes, issue/PR reference style (e.g. `GitHub: #<number>`), punctuation rules.
- `## Pull requests` - PR requirements (extra `gh pr create` flags, required labels, a changelog/news-fragment file).

Example (`AGENTS.md` in a Rust repo):

```markdown
## Code style
Run `cargo fmt`, `cargo clippy --fix`, and `cargo xtask check-typography`.

## Testing
`cargo test`. Changed lines must stay above the coverage gate in CI.

## Commit conventions
Scopes: `client:`, `daemon:`, `control mode:`. References: `GitHub: #<n>`. ASCII punctuation only.

## Pull requests
Add `--label no-news-fragment-needed` for changes with no user-facing effect.
```

## Repository layout

```
.claude-plugin/marketplace.json     # marketplace manifest (name: whmade)
plugins/workflows/
  .claude-plugin/plugin.json        # plugin manifest (name: workflows, unversioned)
  skills/
    commit/SKILL.md
    github-pr/SKILL.md
    scrutinize/SKILL.md
scripts/validate-marketplace.mjs    # dependency-free structural validator (CI + local)
scripts/setup-branch-ruleset.sh     # makes the `validate` check required on main
.github/workflows/validate.yml      # CI: validates manifests + skills on every push
CHANGELOG.md
LICENSE                             # MIT
```

## Updates and stability

The plugin carries no `version`, so its version is the git commit SHA: every commit on `main` is an update consumers pick up next session.
There is no staging branch, so keep `main` green; the `validate` CI check is the guard and should be a required check.
Roll back a bad change with `git revert` on `main`.
Record notable or breaking changes in [`CHANGELOG.md`](CHANGELOG.md).

## Developing a skill locally

```sh
# Validate manifests and skill frontmatter
claude plugin validate .
claude plugin validate ./plugins/workflows

# Load the plugin without a marketplace, to try the skills
claude --plugin-dir ./plugins/workflows

# Or add this checkout as a local marketplace
/plugin marketplace add ./
/plugin install workflows@whmade
```

## License

[MIT](LICENSE).
Each `SKILL.md` also carries an `SPDX-License-Identifier: MIT` header so the license travels with the file when it is installed or copied out of the repo.
