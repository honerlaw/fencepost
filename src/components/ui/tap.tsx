import { useRef, type ComponentProps } from 'react';
import { YStack } from 'tamagui';

type TapProps = Omit<ComponentProps<typeof YStack>, 'role' | 'aria-label' | 'onPress' | 'onPressIn'> & {
  /** Read by screen readers and used by tests to find the target. */
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

/** A press that travels further than this is a drag (a swipe or scroll), not a tap. */
const SLOP = 10;

type PointLike = { nativeEvent?: { pageX?: number; pageY?: number }; pageX?: number; pageY?: number; clientX?: number; clientY?: number };

function pointOf(e: unknown): { x: number; y: number } | null {
  const ev = e as PointLike | undefined;
  const x = ev?.nativeEvent?.pageX ?? ev?.pageX ?? ev?.clientX;
  const y = ev?.nativeEvent?.pageY ?? ev?.pageY ?? ev?.clientY;
  return x == null || y == null ? null : { x, y };
}

/** A tappable surface that is always announced as a labelled button. */
export function Tap({ label, onPress, disabled, children, ...rest }: TapProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const handlePress = (e: unknown) => {
    const from = start.current;
    const to = pointOf(e);
    start.current = null;
    if (from && to && Math.hypot(to.x - from.x, to.y - from.y) > SLOP) return;
    onPress?.();
  };
  return (
    <YStack
      role="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      cursor={disabled ? 'default' : 'pointer'}
      onPressIn={(e: unknown) => (start.current = pointOf(e))}
      onPress={disabled ? undefined : handlePress}
      pressStyle={disabled ? undefined : { opacity: 0.7 }}
      {...rest}
    >
      {children}
    </YStack>
  );
}
