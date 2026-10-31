import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { Tap } from '@/components/ui/tap';
import { shuffleChanged } from '@/game/rng';

interface OrderStepsProps {
  /** In the correct order. */
  steps: string[];
  /** Called with the step indices in the order the player placed them. */
  onDone: (order: number[]) => void;
  /** Set once answered: the order the player placed. */
  picked: number[] | null;
}

const TONE_STYLE = {
  placed: { border: '$blue', bg: '$blueWash', disc: '$blue' },
  pool: { border: '$rule', bg: '$card', disc: '$blue' },
  right: { border: '$green', bg: '$greenWash', disc: '$green' },
  wrong: { border: '$red', bg: '$redWash', disc: '$red' },
} as const;

function StepRow({ n, text, tone }: Readonly<{ n?: number; text: string | undefined; tone: keyof typeof TONE_STYLE }>) {
  const style = TONE_STYLE[tone];
  return (
    <XStack
      gap="$3"
      items="center"
      p="$3"
      minH={48}
      rounded="$3"
      borderWidth={1}
      borderColor={style.border}
      bg={style.bg}
    >
      {n == null ? null : (
        <YStack width={26} height={26} rounded={13} items="center" justify="center" bg={style.disc}>
          <Text fontFamily="$mono" fontWeight="700" fontSize={13} color="$card">
            {n}
          </Text>
        </YStack>
      )}
      <Text flex={1} fontFamily="$body" fontSize="$4" color="$ink">
        {text}
      </Text>
    </XStack>
  );
}

interface Board {
  pool: number[];
  placed: number[];
}

/** Mount with `key={card.id}`: the pool is shuffled once per card so it never starts in the right order. */
export function OrderSteps({ steps, onDone, picked }: Readonly<OrderStepsProps>): React.ReactNode {
  const [{ pool, placed }, setBoard] = useState<Board>(() => ({
    pool: shuffleChanged(
      steps.map((_, i) => i),
      Math.random,
    ),
    placed: [],
  }));

  if (picked) {
    return (
      <YStack gap="$2">
        {picked.map((step, pos) => (
          <YStack key={step} gap="$1">
            <StepRow n={pos + 1} text={steps[step]} tone={step === pos ? 'right' : 'wrong'} />
            {step === pos ? null : (
              <Text fontFamily="$body" fontSize="$2" color="$muted" pl="$2">
                Belongs at step {step + 1}
              </Text>
            )}
          </YStack>
        ))}
      </YStack>
    );
  }

  const place = (step: number) => {
    const next = [...placed, step];
    if (next.length === steps.length) onDone(next);
    else setBoard((board) => ({ ...board, placed: next }));
  };

  return (
    <YStack gap="$3">
      {placed.length > 0 ? (
        <YStack gap="$2">
          {placed.map((step, pos) => (
            <Tap
              key={step}
              label={`Step ${pos + 1}: ${steps[step]}. Tap to send back`}
              onPress={() => setBoard((board) => ({ ...board, placed: placed.filter((s) => s !== step) }))}
            >
              <StepRow n={pos + 1} text={steps[step]} tone="placed" />
            </Tap>
          ))}
        </YStack>
      ) : null}
      <YStack gap="$2">
        {placed.length > 0 ? (
          <Text fontFamily="$body" fontSize="$2" color="$muted">
            Tap the next step
          </Text>
        ) : null}
        {pool
          .filter((step) => !placed.includes(step))
          .map((step) => (
            <Tap key={step} label={`Place: ${steps[step]}`} onPress={() => place(step)}>
              <StepRow text={steps[step]} tone="pool" />
            </Tap>
          ))}
      </YStack>
    </YStack>
  );
}
