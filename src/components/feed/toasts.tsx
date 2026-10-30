import { useEffect } from 'react';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Text, YStack } from 'tamagui';

const TOAST_MS = 2600;

function Toast({ id, text, onDone }: { id: number; text: string; onDone: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), TOAST_MS);
    return () => clearTimeout(t);
  }, [id, onDone]);
  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(200)}>
      <YStack px="$4" py="$2" rounded={999} bg="$goldWash" borderWidth={1} borderColor="$gold">
        <Text fontFamily="$display" fontWeight="800" fontSize="$4" color="$goldInk">
          {text}
        </Text>
      </YStack>
    </Animated.View>
  );
}

export function Toasts({ toasts, onDone }: { toasts: { id: number; text: string }[]; onDone: (id: number) => void }) {
  return (
    <YStack testID="toasts" role="status" aria-live="polite" position="absolute" t={64} l={0} r={0} items="center" gap="$2" pointerEvents="none" z={10}>
      {toasts.map((t) => (
        <Toast key={t.id} id={t.id} text={t.text} onDone={onDone} />
      ))}
    </YStack>
  );
}
