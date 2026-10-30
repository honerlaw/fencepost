import type { TextStyle } from 'react-native';

/** JetBrains Mono turns `<=` into `≤` via contextual alternates; puzzles need the literal characters. */
export const noLigatures: { fontVariant: TextStyle['fontVariant'] } = { fontVariant: ['no-contextual', 'no-common-ligatures'] };
