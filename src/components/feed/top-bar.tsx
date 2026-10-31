import { Text, XStack, YStack } from 'tamagui';

import { Tap } from '@/components/ui/tap';
import { useNow } from '@/components/ui/use-now';
import { displayStreak, localDay, multiplierFor, rankFor } from '@/game/rules';
import type { Progress } from '@/game/types';

function Pill({ label, tone }: { label: string; tone: 'gold' | 'plain' }) {
  return (
    <YStack
      px="$2"
      py={3}
      rounded={999}
      bg={tone === 'gold' ? '$goldWash' : '$wash'}
      borderWidth={1}
      borderColor={tone === 'gold' ? '$gold' : '$rule'}
    >
      <Text fontFamily="$body" fontWeight="700" fontSize={12} color={tone === 'gold' ? '$goldInk' : '$ink'}>
        {label}
      </Text>
    </YStack>
  );
}

const xpFormat = new Intl.NumberFormat('en-US');

export function TopBar({ progress, combo, onMenu }: { progress: Progress; combo: number; onMenu: () => void }) {
  const now = useNow();
  const rank = rankFor(progress.xp);
  const streak = displayStreak(progress.streak, progress.lastDay, localDay(new Date(now)));
  const mult = multiplierFor(combo);
  return (
    <XStack testID="top-bar" items="center" gap="$3" px="$4" py="$2">
      <YStack flex={1} gap={4}>
        <Text testID="rank" fontFamily="$display" fontWeight="800" fontSize="$5" color="$ink">
          {rank.name}
        </Text>
        <YStack height={6} rounded={3} bg="$wash" overflow="hidden" aria-hidden>
          <YStack height={6} width={`${Math.round(rank.progress * 100)}%`} bg="$blue" />
        </YStack>
        <Text testID="xp" fontFamily="$mono" fontSize={11} color="$muted">
          {rank.next == null
            ? `${xpFormat.format(progress.xp)} XP`
            : `${xpFormat.format(progress.xp)} / ${xpFormat.format(rank.next)} XP`}
        </Text>
      </YStack>
      <XStack gap="$2" items="center">
        <Pill label={`${streak}-day streak`} tone="plain" />
        {combo >= 2 ? (
          <Pill label={mult > 1 ? `${combo} in a row · ${mult}x` : `${combo} in a row`} tone="gold" />
        ) : null}
        <Tap
          label="Topics and stats"
          onPress={onMenu}
          width={36}
          height={36}
          rounded={18}
          items="center"
          justify="center"
          bg="$card"
          borderWidth={1}
          borderColor="$rule"
        >
          <YStack gap={3} aria-hidden>
            {[0, 1, 2].map((i) => (
              <YStack key={i} width={14} height={2} rounded={1} bg="$ink" />
            ))}
          </YStack>
        </Tap>
      </XStack>
    </XStack>
  );
}
