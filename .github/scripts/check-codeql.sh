#!/usr/bin/env bash
# CodeQL's analyze step only uploads results, so a finding alone would leave the job green. This
# fails on any security result rated medium or higher (a security-severity of 4.0 or more). A false
# positive takes a `codeql[...]` comment with an entry in scripts/guardrails/suppressions.json:
# dismissing an alert in the UI cannot help, because this reads the SARIF from this run.
set -euo pipefail

# Rules can sit under the driver or under an extension. No rules at all means the SARIF has changed
# shape, so this fails rather than pass without having read a severity.
rules='[.tool.driver.rules[]?, .tool.extensions[]?.rules[]?]'
if [ "$(jq "[.runs[] | $rules | length] | add // 0" "$1"/*.sarif | jq -s 'add')" -eq 0 ]; then
  echo "codeql: no rules in the SARIF" >&2
  exit 1
fi

findings="$(jq -r '
  .runs[]
  | ('"$rules"'
      | map(select((.properties["security-severity"] // "0" | tonumber) >= 4) | .id)) as $ids
  | .results[]
  | select((.ruleId // .rule.id) as $id | $ids | index($id))
  | select((.suppressions // []) | length == 0)
  | "\(.ruleId // .rule.id): \(.locations[0].physicalLocation.artifactLocation.uri):\(.locations[0].physicalLocation.region.startLine)"
' "$1"/*.sarif)"

if [ -n "$findings" ]; then
  echo "$findings"
  exit 1
fi
echo "codeql: no security findings of medium or higher"
