// PreToolUse (Bash): refuses commands that skip the guardrails. This stops an agent from taking the
// shortcut by accident; it is not a security boundary, and CI is what actually enforces the gates.
import { readFileSync } from 'node:fs';

const withoutQuotedText = (command) => command.replaceAll(/'[^']*'|"[^"]*"/g, '""');

const skipsHooks = (part) => {
  const words = part.trim().split(/\s+/);
  if (!words.includes('git')) return false;
  return words.includes('--no-verify') || (words.includes('commit') && words.some((word) => /^-[a-z]*n/i.test(word)));
};

const RULES = [
  {
    reason: 'skips the git hooks',
    matches: (command) =>
      withoutQuotedText(command)
        .split(/[|;&\n]/)
        .some((part) => skipsHooks(part)),
  },
  {
    reason: 'turns off lefthook',
    matches: (command) => /\bLEFTHOOK(?:_EXCLUDE|_QUIET)?=/.test(withoutQuotedText(command)),
  },
  {
    reason: 'points git at different hooks',
    matches: (command) => withoutQuotedText(command).includes('core.hooksPath'),
  },
  {
    reason: 'adds the label only a person may add',
    matches: (command) =>
      command.split(/[|;&\n]/).some((part) => {
        const isLabelWrite = /\bgh\b/.test(part) && (part.includes('--add-label') || part.includes('/labels'));
        return isLabelWrite && part.includes('guardrails-approved');
      }),
  },
];

const command = JSON.parse(readFileSync(0, 'utf8')).tool_input?.command ?? '';
const hit = RULES.find((rule) => rule.matches(command));
if (hit !== undefined) {
  console.error(`Blocked: this command ${hit.reason}. Fix the failure instead, or ask the user to do this themselves.`);
  process.exit(2);
}
