import { Text } from 'tamagui';

export function Title({ children }: Readonly<{ children: string }>): React.ReactNode {
  return (
    <Text role="heading" fontFamily="$display" fontWeight="800" fontSize="$8" lineHeight="$8" color="$ink">
      {children}
    </Text>
  );
}
