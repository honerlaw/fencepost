import { describe, expect, it } from 'vitest';

import { codeText } from './no-ligatures';

describe('codeText (native ligature breaking)', () => {
  it('puts a word joiner between neighbouring symbols only', () => {
    expect(codeText('if r.start <= s and e <= r.end:')).toBe('if r.start <⁠= s and e <⁠= r.end:');
    expect(codeText('a == b != c -> d')).toBe('a =⁠= b !⁠= c -⁠> d');
    expect(codeText('x = y // 2')).toBe('x = y /⁠/ 2');
  });

  it('leaves text without symbol pairs alone and looks the same once joiners are removed', () => {
    expect(codeText('return True')).toBe('return True');
    const line = 'if len(hits) >= LIMIT and a <== b:';
    expect(codeText(line).replaceAll('⁠', '')).toBe(line);
  });
});
