import { Text } from 'tamagui';

import { Tap } from './tap';

/** A quiet underlined action for things less important than the main button. */
export function TextButton({ label, onPress }: Readonly<{ label: string; onPress: () => void }>): React.ReactNode {
  return (
    <Tap label={label} onPress={onPress} self="center" py="$1" px="$3">
      <Text fontFamily="$body" fontSize="$3" color="$muted" textDecorationLine="underline">
        {label}
      </Text>
    </Tap>
  );
}
