import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { Tap } from '@/components/ui/tap';
import { MarkerCircle, type Box } from './marker-circle';
import { codeText, noLigatures } from './no-ligatures';

export interface CodeReveal {
  /** Index of the wrong line (flaw cards). */
  answer: number;
  /** Line the player tapped. */
  picked: number;
}

interface CodeBlockProps {
  code: string[];
  /** Flaw cards: each line is a tap target until answered. */
  onPickLine?: (index: number) => void;
  reveal?: CodeReveal | null;
}

const LINE_TINT = { idle: undefined, flaw: undefined, right: '$greenWash', wrong: '$redWash' } as const;

function splitIndent(line: string): [string, string] {
  const body = line.trimStart();
  return [line.slice(0, line.length - body.length), body];
}

function CodeLine({
  index,
  line,
  state,
  onPick,
}: Readonly<{
  index: number;
  line: string;
  state: keyof typeof LINE_TINT;
  onPick: (() => void) | undefined;
}>) {
  const [box, setBox] = useState<Box | null>(null);
  const [indent, body] = splitIndent(line);
  const content = (
    <XStack items="center" minH={onPick || state !== 'idle' ? 36 : 22} px="$2" bg={LINE_TINT[state]} rounded="$2">
      <Text fontFamily="$mono" fontSize={12.5} color="$muted" width={22} text="right" mr="$3" select="none">
        {index + 1}
      </Text>
      {indent ? (
        <Text fontFamily="$mono" fontSize={12.5} whiteSpace="pre">
          {indent}
        </Text>
      ) : null}
      <YStack position="relative">
        <Text
          fontFamily="$mono"
          fontSize={12.5}
          color={state === 'wrong' ? '$red' : '$ink'}
          textDecorationLine={state === 'wrong' ? 'line-through' : 'none'}
          {...noLigatures}
          whiteSpace="pre"
          onLayout={(e) => setBox(e.nativeEvent.layout)}
        >
          {codeText(body) || ' '}
        </Text>
        {(state === 'flaw' || state === 'right') && box ? <MarkerCircle box={box} /> : null}
      </YStack>
    </XStack>
  );
  if (!onPick) return content;
  return (
    <Tap label={`Line ${index + 1}: ${line.trim()}`} onPress={onPick}>
      {content}
    </Tap>
  );
}

export function CodeBlock({ code, onPickLine, reveal }: Readonly<CodeBlockProps>): React.ReactNode {
  const stateFor = (i: number): keyof typeof LINE_TINT => {
    if (!reveal) return 'idle';
    if (i === reveal.answer) return reveal.picked === i ? 'right' : 'flaw';
    if (i === reveal.picked) return 'wrong';
    return 'idle';
  };
  return (
    <YStack bg="$wash" rounded="$3" borderWidth={1} borderColor="$rule" overflow="hidden">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12, paddingRight: 24 }}
      >
        <YStack gap={onPickLine || reveal ? 2 : 0}>
          {code.map((line, i) => (
            <CodeLine
              key={i}
              index={i}
              line={line}
              state={stateFor(i)}
              onPick={onPickLine && !reveal ? () => onPickLine(i) : undefined}
            />
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
