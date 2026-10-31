import { Text, YStack } from 'tamagui';
import { useNow } from '@/components/ui/use-now';
import { displayStreak, localDay, rankFor } from '@/game/rules';
import type { Progress } from '@/game/types';
import { Button } from './button';
import { Eyebrow } from './eyebrow';
import { Frame } from './frame';
import { Title } from './title';

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack flex={1} minW={120} p="$3" rounded="$3" bg="$wash" gap={2}>
      <Text fontFamily="$mono" fontWeight="700" fontSize="$6" color="$ink">
        {value}
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$muted">
        {label}
      </Text>
    </YStack>
  );
}

export function WelcomeCard({
  progress,
  onDealIn,
}: Readonly<{ progress: Progress; onDealIn: () => void }>): React.ReactNode {
  const now = useNow();
  const streak = displayStreak(progress.streak, progress.lastDay, localDay(new Date(now)));
  return (
    <Frame testID="welcome">
      <Eyebrow>Fencepost</Eyebrow>
      <Title>Welcome back</Title>
      <YStack flexDirection="row" flexWrap="wrap" gap="$2">
        <Stat label="Rank" value={rankFor(progress.xp).name} />
        <Stat label="XP" value={String(progress.xp)} />
        <Stat label="Day streak" value={String(streak)} />
        <Stat label="Rematches waiting" value={String(progress.missed.length)} />
      </YStack>
      <Button label="Deal me in" onPress={onDealIn} />
    </Frame>
  );
}
