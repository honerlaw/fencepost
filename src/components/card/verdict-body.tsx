import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text, XStack, YStack } from 'tamagui';

import { Tap } from '@/components/ui/tap';
import { TextButton } from '@/components/ui/text-button';
import type { PlayedCard, ReviewedResult } from '@/game/types';

function Tag({ label }: Readonly<{ label: string }>) {
  return (
    <YStack px="$2" py={2} rounded="$2" bg="$goldWash">
      <Text fontFamily="$mono" fontWeight="700" fontSize={12} color="$goldInk">
        {label}
      </Text>
    </YStack>
  );
}

function Hint({ text }: Readonly<{ text: string }>) {
  return (
    <Text fontFamily="$body" fontSize="$2" color="$muted" text="center">
      {text}
    </Text>
  );
}

function PrimaryButton({ label, onPress }: Readonly<{ label: string; onPress: () => void }>) {
  return (
    <Tap label={label} onPress={onPress} bg="$ink" rounded="$4" py="$3" items="center">
      <Text fontFamily="$display" fontWeight="800" fontSize="$5" color="$card">
        {label}
      </Text>
    </Tap>
  );
}

interface VerdictAction {
  label: string;
  onPress: () => void;
}

interface VerdictBodyProps {
  card: PlayedCard;
  result: ReviewedResult;
  testID: string;
  primary: VerdictAction;
  hint: string;
  /** Smaller actions under the hint. */
  links: VerdictAction[];
}

export function VerdictBody({
  card,
  result,
  testID,
  primary,
  hint,
  links,
}: Readonly<VerdictBodyProps>): React.ReactNode {
  const { correct, score } = result;
  return (
    <Animated.View entering={FadeInDown.duration(280)}>
      <YStack
        testID={testID}
        bg="$card"
        rounded="$5"
        borderWidth={1}
        borderColor={correct ? '$green' : '$red'}
        p="$4"
        gap="$3"
      >
        <XStack items="center" justify="space-between" gap="$3">
          <Text
            fontFamily="$marker"
            fontWeight="700"
            fontSize={30}
            lineHeight={38}
            color={correct ? '$green' : '$red'}
            style={{ transform: [{ rotate: '-2deg' }] }}
          >
            {result.verdict}
          </Text>
          <Text
            testID="verdict-points"
            fontFamily="$display"
            fontWeight="800"
            fontSize="$7"
            color={correct ? '$ink' : '$muted'}
          >
            +{score.points}
          </Text>
        </XStack>
        {correct && (score.multiplier > 1 || score.doubled || card.boss) ? (
          <XStack gap="$2" flexWrap="wrap">
            {card.boss ? <Tag label="Boss 3x" /> : null}
            {score.multiplier > 1 ? <Tag label={`Combo ×${score.multiplier}`} /> : null}
            {score.doubled ? <Tag label="2x card" /> : null}
          </XStack>
        ) : null}
        <Text fontFamily="$body" fontSize="$4" lineHeight="$4" color="$ink">
          {card.why}
        </Text>
        <PrimaryButton label={primary.label} onPress={primary.onPress} />
        <Hint text={hint} />
        {links.map((link) => (
          <TextButton key={link.label} label={link.label} onPress={link.onPress} />
        ))}
        {result.flagged ? (
          <Text fontFamily="$body" fontSize="$3" color="$muted" text="center">
            {"Thanks. This one won't count against you."}
          </Text>
        ) : null}
      </YStack>
    </Animated.View>
  );
}
