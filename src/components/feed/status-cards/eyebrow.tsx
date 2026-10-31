import { Text } from 'tamagui';

export function Eyebrow({ children }: Readonly<{ children: string }>): React.ReactNode {
  return (
    <Text fontFamily="$body" fontWeight="700" fontSize={12} letterSpacing={1} color="$blue" textTransform="uppercase">
      {children}
    </Text>
  );
}
