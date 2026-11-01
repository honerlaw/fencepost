interface Rule {
  name: string;
  pattern: RegExp;
}

/**
 * Syntax a reader would need to know a particular language to follow. A denylist cannot
 * prove a card is readable, so this is a backstop behind the prompt's pseudocode rules.
 * The patterns only ever see one line, with its double-quoted strings emptied.
 */
const RULES: Rule[] = [
  { name: 'def', pattern: /\bdef\b/ },
  { name: 'elif', pattern: /\belif\b/ },
  { name: 'lambda', pattern: /\blambda\b/ },
  { name: 'None', pattern: /\bNone\b/ },
  { name: 'True', pattern: /\bTrue\b/ },
  { name: 'False', pattern: /\bFalse\b/ },
  { name: 'null', pattern: /\bnull\b/ },
  { name: 'nil', pattern: /\bnil\b/ },
  { name: 'const', pattern: /\bconst\b/ },
  { name: 'let', pattern: /\blet\b/ },
  { name: 'var', pattern: /\bvar\b/ },
  { name: 'print()', pattern: /\bprint\(/ },
  { name: 'len()', pattern: /\blen\(/ },
  { name: 'range()', pattern: /\brange\(/ },
  { name: '.append()', pattern: /\.append\(/ },
  { name: '.push()', pattern: /\.push\(/ },
  { name: '.length', pattern: /\.length\b/ },
  { name: '//', pattern: /\/\// },
  { name: '%', pattern: /%/ },
  { name: '**', pattern: /\*\*/ },
  { name: '&&', pattern: /&&/ },
  { name: '||', pattern: /\|\|/ },
  { name: '! as not', pattern: /!(?!=)/ },
  { name: 'strict equality', pattern: /[=!]==/ },
  { name: '=>', pattern: /=>/ },
  { name: '->', pattern: /->/ },
  { name: ':=', pattern: /:=/ },
  { name: '++ or --', pattern: /\+\+|--/ },
  { name: 'compound assignment', pattern: /[-+*/]=/ },
  { name: 'ternary or null operator', pattern: /\?/ },
  { name: 'braces', pattern: /[{}]/ },
  { name: 'trailing semicolon', pattern: /;\s*$/ },
  { name: '# comment', pattern: /#/ },
  { name: 'negative index', pattern: /\[\s*-\s*\d/ },
  { name: 'f-string', pattern: /\bf""/ },
  { name: 'list repetition', pattern: /(?:^|[\s(=,])\[[^\]]*\]\s*\*/ },
];

const QUOTED = /"(?:[^"\\]|\\.)*"/g;

/** `x = a if b else c`, as opposed to the dialect's own `else if` and `if`. */
function isInlineConditional(line: string): boolean {
  const words = line.trim().split(/\s+/);
  const ifAt = words.indexOf('if');
  return ifAt > 0 && words[0] !== 'else' && words.indexOf('else') > ifAt;
}

/** `[t for t in items`: the loop can run past the bracket when a line was wrapped. */
function isComprehension(line: string): boolean {
  const open = line.indexOf('[');
  return open !== -1 && line.slice(open).split(/\s+/).includes('for');
}

/** `items[1:3]`: a colon before the bracket closes. */
function isSlice(line: string): boolean {
  return line.split('[').some((part, i) => i > 0 && part.split(']', 1).join('').includes(':'));
}

/** Names the first language-specific construct on a line of card code, or null. */
export function findLanguageSyntax(line: string): string | null {
  const code = line.replaceAll(QUOTED, '""');
  if (isInlineConditional(code)) return 'inline conditional';
  if (isComprehension(code)) return 'comprehension';
  if (isSlice(code)) return 'slice';
  return RULES.find((rule) => rule.pattern.test(code))?.name ?? null;
}
