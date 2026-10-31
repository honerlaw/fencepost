import { Text, XStack, YStack } from 'tamagui';

import { Tap } from '@/components/ui/tap';
import { OPTION_LETTERS } from './labels';

interface OptionsProps {
  options: string[];
  onPick: (index: number) => void;
  /** Set once answered: the right option and the one tapped. */
  reveal: { answer: number; picked: number } | null;
}

type Mark = 'idle' | 'right' | 'wrong';

const MARK_STYLE = {
  idle: { border: '$rule', bg: '$card', disc: '$wash' },
  right: { border: '$green', bg: '$greenWash', disc: '$green' },
  wrong: { border: '$red', bg: '$redWash', disc: '$red' },
} as const;

function markFor(i: number, reveal: OptionsProps['reveal']): Mark {
  if (reveal == null) return 'idle';
  if (i === reveal.answer) return 'right';
  return i === reveal.picked ? 'wrong' : 'idle';
}

function OptionRow({ letter, text, mark }: Readonly<{ letter: string | undefined; text: string; mark: Mark }>) {
  const style = MARK_STYLE[mark];
  const glyph = { idle: letter, right: '✓', wrong: '✗' }[mark];
  const marked = mark !== 'idle';
  const wrong = mark === 'wrong';
  return (
    <XStack
      gap="$3"
      items="center"
      p="$3"
      minH={48}
      rounded="$3"
      borderWidth={marked ? 2 : 1}
      borderColor={style.border}
      bg={style.bg}
    >
      <YStack width={26} height={26} rounded={13} items="center" justify="center" bg={style.disc}>
        <Text fontFamily="$body" fontWeight="700" fontSize={13} color={marked ? '$card' : '$muted'}>
          {glyph}
        </Text>
      </YStack>
      <Text
        flex={1}
        fontFamily="$body"
        fontSize="$4"
        color={wrong ? '$red' : '$ink'}
        textDecorationLine={wrong ? 'line-through' : 'none'}
      >
        {text}
      </Text>
    </XStack>
  );
}

export function Options({ options, onPick, reveal }: Readonly<OptionsProps>): React.ReactNode {
  return (
    <YStack gap="$2">
      {options.map((option, i) => {
        const letter = OPTION_LETTERS[i];
        const row = <OptionRow letter={letter} text={option} mark={markFor(i, reveal)} />;
        if (reveal) return <YStack key={i}>{row}</YStack>;
        return (
          <Tap key={i} label={`Option ${letter}: ${option}`} onPress={() => onPick(i)}>
            {row}
          </Tap>
        );
      })}
    </YStack>
  );
}
