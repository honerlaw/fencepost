import { YStack } from 'tamagui';

export function Frame({ testID, children }: Readonly<{ testID: string; children: React.ReactNode }>): React.ReactNode {
  return (
    <YStack testID={testID} bg="$card" rounded="$5" borderWidth={1} borderColor="$rule" p="$5" gap="$3">
      {children}
    </YStack>
  );
}
