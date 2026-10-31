#!/usr/bin/env bash
# CodeQL's analyze step only uploads results, so a finding alone would leave the job green. This
# fails on any security result rated medium or higher (a security-severity of 4.0 or more).
set -euo pipefail

findings="$(jq -r '
  .runs[]
  | ([.tool.extensions[]?.rules[]?
      | select((.properties["security-severity"] // "0" | tonumber) >= 4)
      | .id]) as $ids
  | .results[]
  | select(.ruleId as $id | $ids | index($id))
  | "\(.ruleId): \(.locations[0].physicalLocation.artifactLocation.uri):\(.locations[0].physicalLocation.region.startLine)"
' "$1"/*.sarif)"

if [ -n "$findings" ]; then
  echo "$findings"
  exit 1
fi
echo "codeql: no security findings of medium or higher"
