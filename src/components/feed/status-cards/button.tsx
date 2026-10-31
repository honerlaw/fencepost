import { Text } from 'tamagui';
import { Tap } from '@/components/ui/tap';

export function Button({ label, onPress }: Readonly<{ label: string; onPress: () => void }>): React.ReactNode {
  return (
    <Tap label={label} onPress={onPress} bg="$ink" rounded="$4" py="$3" items="center">
      <Text fontFamily="$display" fontWeight="800" fontSize="$5" color="$card">
        {label}
      </Text>
    </Tap>
  );
}
