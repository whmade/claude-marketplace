#!/usr/bin/env bash
# Require the `validate` CI check to pass before a change lands on the default
# branch. The plugin is unversioned and tracks `main`, so this ruleset is the
# guard that keeps `main` shippable to consumers.
#
# Rulesets need the repo to be public or on GitHub Pro; on a private free repo
# the API returns 403. Run this once the repo is public:
#
#   bash scripts/setup-branch-ruleset.sh
set -euo pipefail

REPO="${1:-whmade/claude-marketplace}"
NAME="main - require validate"

if gh api "repos/$REPO/rulesets" --jq ".[] | select(.name==\"$NAME\") | .id" 2>/dev/null | grep -q .; then
  echo "Ruleset \"$NAME\" already exists on $REPO; nothing to do."
  exit 0
fi

gh api --method POST "repos/$REPO/rulesets" --input - <<'JSON'
{
  "name": "main - require validate",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": true,
        "required_status_checks": [ { "context": "validate" } ]
      }
    }
  ]
}
JSON

echo "Created ruleset \"$NAME\" on $REPO."
