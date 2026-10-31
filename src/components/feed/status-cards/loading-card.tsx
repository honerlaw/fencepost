import { Text } from 'tamagui';
import { domainName, isDomainId } from '@/cards/domains';
import { useNow } from '@/components/ui/use-now';
import { Eyebrow } from './eyebrow';
import { Frame } from './frame';
import { Title } from './title';

export function LoadingCard({ since, domain }: Readonly<{ since: number; domain: string | null }>): React.ReactNode {
  const now = useNow(1000);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <Frame testID="loading">
      <Eyebrow>{domain != null && isDomainId(domain) ? domainName(domain) : 'Fresh puzzles'}</Eyebrow>
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
