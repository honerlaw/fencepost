import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';

// Milestone 1 placeholder: a themed screen proving tokens, fonts and light/dark themes.
export default function Feed() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} items="center" justify="center" bg="$board" p="$4" gap="$3">
        <YStack bg="$card" borderColor="$rule" borderWidth={1} rounded="$4" p="$5" gap="$2" width="100%" maxW={480}>
          <Text fontFamily="$body" fontWeight="700" color="$blue" fontSize="$2" textTransform="uppercase" letterSpacing={1}>
            Spot the flaw · Restaurant reservations
          </Text>
          <Text fontFamily="$display" fontWeight="800" color="$ink" fontSize="$8">
            Overlapping bookings
          </Text>
          <Text fontFamily="$body" color="$muted" fontSize="$5">
            Fencepost is warming up.
          </Text>
          <Text fontFamily="$mono" color="$ink" fontSize="$3">
            if r.start {'<='} s and e {'<='} r.end:
          </Text>
          <Text fontFamily="$marker" fontWeight="700" color="$red" fontSize="$8" style={{ transform: [{ rotate: '-2deg' }] }}>
            Nice catch.
          </Text>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
