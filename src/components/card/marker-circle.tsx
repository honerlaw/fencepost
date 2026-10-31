import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from 'tamagui';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PAD_X = 10;
const PAD_Y = 7;
const STROKE = 2.5;
/** Room for the wobble so the loop never touches the SVG edge. */
const WOBBLE = 1.08;
const STEPS = 56;

function radii(box: Box) {
  return { rx: box.width / 2 + PAD_X, ry: box.height / 2 + PAD_Y };
}

/**
 * A loose loop round an ellipse: starts upper-left, goes once round clockwise with a
 * slight wobble, and overshoots the start a little, like a marker on a whiteboard.
 */
function loopPath(rx: number, ry: number): string {
  const cx = rx * WOBBLE + STROKE;
  const cy = ry * WOBBLE + STROKE;
  const start = Math.PI * 1.12;
  const sweep = Math.PI * 2 * 1.08;
  let d = '';
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const a = start + sweep * t;
    // Drift outward as the stroke comes round, so the overshoot doesn't retrace the start.
    const r = 1 + 0.06 * t + 0.015 * Math.sin(a * 3);
    const x = cx + rx * r * Math.cos(a);
    const y = cy + ry * r * Math.sin(a);
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d.trim();
}

/** Ramanujan's ellipse perimeter, scaled for the overshoot; only used to size the dash. */
function approxLength(rx: number, ry: number): number {
  return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))) * 1.12;
}

/** Hand-drawn red loop around `box`, drawn over about 0.55 s (instantly with reduce motion). */
export function MarkerCircle({ box }: Readonly<{ box: Box }>): React.ReactNode {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { rx, ry } = radii(box);
  const length = approxLength(rx, ry);
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) progress.set(1);
    else progress.set(withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) }));
  }, [progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.get()) }));

  const width = 2 * (rx * WOBBLE + STROKE);
  const height = 2 * (ry * WOBBLE + STROKE);
  return (
    <Svg
      testID="marker-circle"
      pointerEvents="none"
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: box.x + box.width / 2 - width / 2,
        top: box.y + box.height / 2 - height / 2,
      }}
    >
      <AnimatedPath
        d={loopPath(rx, ry)}
        stroke={theme.red.val}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={[length, length]}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
