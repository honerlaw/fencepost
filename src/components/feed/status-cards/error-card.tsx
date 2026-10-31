import { Text } from 'tamagui';
import type { FetchErrorCode } from '@/game/fetch-policy';
import { Button } from './button';
import { Eyebrow } from './eyebrow';
import { Frame } from './frame';
import { Title } from './title';

const ERROR_TEXT: Record<FetchErrorCode, string> = {
  rate_limited: "You're going fast. New cards will be ready in a minute.",
  unavailable: "The card writer isn't available right now.",
  network: "Couldn't reach the server. Check your connection.",
  upstream_error: 'The card writer had a problem with that batch.',
  bad_request: 'That request was rejected.',
};

export function ErrorCard({ code, onRetry }: Readonly<{ code: FetchErrorCode; onRetry: () => void }>): React.ReactNode {
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
