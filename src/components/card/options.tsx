import { Text, XStack, YStack } from 'tamagui';

import { Tap } from '@/components/ui/tap';
import { OPTION_LETTERS } from './labels';

interface OptionsProps {
  options: string[];
  onPick: (index: number) => void;
  /** Set once answered: the right option and the one tapped. */
  reveal: { answer: number; picked: number } | null;
}

export function Options({ options, onPick, reveal }: OptionsProps) {
  return (
    <YStack gap="$2">
      {options.map((option, i) => {
        const right = reveal != null && i === reveal.answer;
        const wrong = reveal != null && i === reveal.picked && !right;
        const letter = OPTION_LETTERS[i];
        const row = (
          <XStack
            gap="$3"
            items="center"
            p="$3"
            minH={48}
            rounded="$3"
            borderWidth={right || wrong ? 2 : 1}
            borderColor={right ? '$green' : wrong ? '$red' : '$rule'}
            bg={right ? '$greenWash' : wrong ? '$redWash' : '$card'}
          >
            <YStack width={26} height={26} rounded={13} items="center" justify="center" bg={right ? '$green' : wrong ? '$red' : '$wash'}>
              <Text fontFamily="$body" fontWeight="700" fontSize={13} color={right || wrong ? '$card' : '$muted'}>
                {right ? '✓' : wrong ? '✗' : letter}
              </Text>
            </YStack>
            <Text
              flex={1}
              fontFamily="$body"
              fontSize="$4"
              color={wrong ? '$red' : '$ink'}
              textDecorationLine={wrong ? 'line-through' : 'none'}
            >
              {option}
            </Text>
          </XStack>
        );
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
