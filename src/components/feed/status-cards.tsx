import { Text, YStack } from 'tamagui';

import { domainName, isDomainId } from '@/cards/domains';
import { Tap } from '@/components/ui/tap';
import { useNow } from '@/components/ui/use-now';
import type { FetchErrorCode } from '@/game/fetch-policy';
import { displayStreak, localDay, rankFor } from '@/game/rules';
import type { Progress } from '@/game/types';

function Frame({ testID, children }: { testID: string; children: React.ReactNode }) {
  return (
    <YStack testID={testID} bg="$card" rounded="$5" borderWidth={1} borderColor="$rule" p="$5" gap="$3">
      {children}
    </YStack>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <Text fontFamily="$body" fontWeight="700" fontSize={12} letterSpacing={1} color="$blue" textTransform="uppercase">
      {children}
    </Text>
  );
}

function Title({ children }: { children: string }) {
  return (
    <Text role="heading" fontFamily="$display" fontWeight="800" fontSize="$8" lineHeight="$8" color="$ink">
      {children}
    </Text>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tap label={label} onPress={onPress} bg="$ink" rounded="$4" py="$3" items="center">
      <Text fontFamily="$display" fontWeight="800" fontSize="$5" color="$card">
        {label}
      </Text>
    </Tap>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
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

export function WelcomeCard({ progress, onDealIn }: { progress: Progress; onDealIn: () => void }) {
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

export function LoadingCard({ since, domain }: { since: number; domain: string | null }) {
  const now = useNow(1000);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <Frame testID="loading">
      <Eyebrow>{domain && isDomainId(domain) ? domainName(domain) : 'Fresh puzzles'}</Eyebrow>
      <Title>Shuffling the deck</Title>
      <Text fontFamily="$body" fontSize="$5" color="$ink">
        Writing new cards… <Text fontFamily="$mono">{seconds}s</Text>
      </Text>
      <Text fontFamily="$body" fontSize="$3" color="$muted">
        A batch usually takes 20 to 60 seconds.
      </Text>
    </Frame>
  );
}

const ERROR_TEXT: Record<FetchErrorCode, string> = {
  rate_limited: "You're going fast. New cards will be ready in a minute.",
  unavailable: "The card writer isn't available right now.",
  network: "Couldn't reach the server. Check your connection.",
  upstream_error: 'The card writer had a problem with that batch.',
  bad_request: 'That request was rejected.',
};

export function ErrorCard({ code, onRetry }: { code: FetchErrorCode; onRetry: () => void }) {
  return (
    <Frame testID="error">
      <Eyebrow>Out of cards</Eyebrow>
      <Title>No new puzzles yet</Title>
      <Text fontFamily="$body" fontSize="$5" color="$ink">
        {ERROR_TEXT[code]}
      </Text>
      <Button label="Try again" onPress={onRetry} />
    </Frame>
  );
}
