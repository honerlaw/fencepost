// PreToolUse (Bash): refuses commands that skip the guardrails. This stops an agent from taking the
// shortcut by accident; it is not a security boundary, and CI is what actually enforces the gates.
import { readFileSync } from 'node:fs';

const withoutQuotedText = (command) => command.replaceAll(/'[^']*'|"[^"]*"/g, '""');

const RULES = [
  {
    reason: 'skips the git hooks',
    pattern: /\bgit\b[^|;&\n]*\s--no-verify\b/,
    target: withoutQuotedText,
  },
  {
    reason: 'skips the git hooks',
    pattern: /\bgit\s+commit\b[^|;&\n]*\s-[a-zA-Z]*n[a-zA-Z]*(\s|$)/,
    target: withoutQuotedText,
  },
  {
    reason: 'turns off lefthook',
    pattern: /\bLEFTHOOK(_EXCLUDE|_QUIET)?=/,
    target: withoutQuotedText,
  },
  {
    reason: 'points git at different hooks',
    pattern: /\bcore\.hooksPath\b/,
    target: withoutQuotedText,
  },
  {
    reason: 'adds the label only a person may add',
    pattern: /\bgh\b[^\n;|&]*(--add-label|\/labels)[^\n;|&]*guardrails-approved/,
    target: (command) => command,
  },
];

const command = JSON.parse(readFileSync(0, 'utf8')).tool_input?.command ?? '';
const hit = RULES.find(({ pattern, target }) => pattern.test(target(command)));
if (hit !== undefined) {
  console.error(`Blocked: this command ${hit.reason}. Fix the failure instead, or ask the user to do this themselves.`);
  process.exit(2);
}
