import { ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { DOMAINS } from '@/cards/domains';
import { Tap } from '@/components/ui/tap';
import type { DomainId, Progress } from '@/game/types';
import { toggleDomain } from './toggle-domain';

function Chip({ label, on, onPress }: Readonly<{ label: string; on: boolean; onPress: () => void }>) {
  return (
    <Tap
      label={label}
      aria-pressed={on}
      onPress={onPress}
      px="$3"
      py="$2"
      rounded={999}
      borderWidth={1}
      borderColor={on ? '$blue' : '$rule'}
      bg={on ? '$blueWash' : '$card'}
    >
      <Text fontFamily="$body" fontWeight="700" fontSize="$3" color={on ? '$blue' : '$ink'}>
        {label}
      </Text>
    </Tap>
  );
}

function Stat({ testID, label, value }: Readonly<{ testID: string; label: string; value: string }>) {
  return (
    <YStack flex={1} minW={120} p="$3" rounded="$3" bg="$wash" gap={2}>
      <Text testID={testID} fontFamily="$mono" fontWeight="700" fontSize="$6" color="$ink">
        {value}
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$muted">
        {label}
      </Text>
    </YStack>
  );
}

interface TopicsSheetProps {
  progress: Progress;
  onChange: (domains: DomainId[]) => void;
  onClose: () => void;
}

export function TopicsSheet({ progress, onChange, onClose }: Readonly<TopicsSheetProps>): React.ReactNode {
  const insets = useSafeAreaInsets();
  const selected = progress.domains;
  const accuracy = progress.answered === 0 ? '–' : `${Math.round((progress.correct / progress.answered) * 100)}%`;
  return (
    <YStack position="absolute" t={0} l={0} r={0} b={0} z={20} justify="flex-end">
      <Animated.View
        entering={FadeIn.duration(180)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Tap
          label="Close topics"
          onPress={onClose}
          flex={1}
          bg="rgba(0,0,0,0.35)"
          cursor="default"
          pressStyle={{ opacity: 1 }}
        />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(260)} style={{ maxHeight: '88%' }}>
        <YStack
          testID="topics-sheet"
          role="dialog"
          aria-label="Topics and stats"
          bg="$card"
          borderTopLeftRadius={20}
          borderTopRightRadius={20}
          borderWidth={1}
          borderColor="$rule"
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 20 + insets.bottom, gap: 16 }}>
            <XStack items="center" justify="space-between">
              <Text fontFamily="$display" fontWeight="800" fontSize="$8" color="$ink">
                Fencepost
              </Text>
              <Tap label="Done" onPress={onClose} px="$3" py="$2" rounded="$3" bg="$ink">
                <Text fontFamily="$display" fontWeight="800" fontSize="$4" color="$card">
                  Done
                </Text>
              </Tap>
            </XStack>
            <YStack gap="$2">
              <Text
                fontFamily="$body"
                fontWeight="700"
                fontSize={12}
                letterSpacing={1}
                color="$blue"
                textTransform="uppercase"
              >
                Topics
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                <Chip label="All topics" on={selected.length === 0} onPress={() => onChange([])} />
                {DOMAINS.map((d) => (
                  <Chip
                    key={d.id}
                    label={d.name}
                    on={selected.includes(d.id)}
                    onPress={() => onChange(toggleDomain(selected, d.id))}
                  />
                ))}
              </XStack>
              <Text fontFamily="$body" fontSize="$2" color="$muted">
                Applies from the next batch of cards.
              </Text>
            </YStack>
            <YStack gap="$2">
              <Text
                fontFamily="$body"
                fontWeight="700"
                fontSize={12}
                letterSpacing={1}
                color="$blue"
                textTransform="uppercase"
              >
                Stats
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                <Stat testID="stat-answered" label="Cards answered" value={String(progress.answered)} />
                <Stat testID="stat-accuracy" label="Accuracy" value={accuracy} />
                <Stat testID="stat-best" label="Best run" value={String(progress.bestCombo)} />
                <Stat testID="stat-rematches" label="Rematches waiting" value={String(progress.missed.length)} />
              </XStack>
            </YStack>
            <Text fontFamily="$body" fontSize="$3" color="$muted">
              Puzzles are written live by an AI model, so now and then one is wrong. If you think so, tap “Card was
              wrong” after answering.
            </Text>
          </ScrollView>
        </YStack>
      </Animated.View>
    </YStack>
  );
}
