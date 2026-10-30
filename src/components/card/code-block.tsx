import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { Tap } from '@/components/ui/tap';
import { MarkerCircle, type Box } from './marker-circle';
import { noLigatures } from './no-ligatures';

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

function splitIndent(line: string): [string, string] {
  const body = line.trimStart();
  return [line.slice(0, line.length - body.length), body];
}

function CodeLine({ index, line, state, onPick }: { index: number; line: string; state: 'idle' | 'right' | 'wrong' | 'flaw'; onPick?: () => void }) {
  const [box, setBox] = useState<Box | null>(null);
  const [indent, body] = splitIndent(line);
  const tint = state === 'right' ? '$greenWash' : state === 'wrong' ? '$redWash' : undefined;
  const content = (
    <XStack items="center" minH={onPick || state !== 'idle' ? 36 : 22} px="$2" bg={tint} rounded="$2">
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
          {body || ' '}
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

export function CodeBlock({ code, onPickLine, reveal }: CodeBlockProps) {
  const stateFor = (i: number): 'idle' | 'right' | 'wrong' | 'flaw' => {
    if (!reveal) return 'idle';
    if (i === reveal.answer) return reveal.picked === i ? 'right' : 'flaw';
    if (i === reveal.picked) return 'wrong';
    return 'idle';
  };
  return (
    <YStack bg="$wash" rounded="$3" borderWidth={1} borderColor="$rule" overflow="hidden">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, paddingRight: 24 }}>
        <YStack gap={onPickLine || reveal ? 2 : 0}>
          {code.map((line, i) => (
            <CodeLine key={i} index={i} line={line} state={stateFor(i)} onPick={onPickLine && !reveal ? () => onPickLine(i) : undefined} />
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
