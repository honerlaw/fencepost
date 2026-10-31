import { useEffect, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { GestureDetector, ScrollView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { CardView } from '@/components/card/card-view';
import { VerdictPanel } from '@/components/card/verdict-panel';
import type { Slot } from '@/game/engine';
import { canSwipeAdvance } from '@/game/rules';
import type { Progress } from '@/game/types';
import { playHaptic } from '@/lib/haptics';
import { gameStore, useGame } from '@/store';
import { DotGrid } from './dot-grid';
import { ErrorCard, LoadingCard, WelcomeCard } from './status-cards';
import { Toasts } from './toasts';
import { TopBar } from './top-bar';
import { TopicsSheet } from './topics-sheet';
import { useAppLifecycle } from './use-app-lifecycle';

const LEAVE_MS = 200;
const ENTER_MS = 300;
const SWIPE_DISTANCE = 60;

function slotKey(slot: Slot): string {
  return slot.kind === 'card' ? `card:${slot.card.id}` : slot.kind;
}

function SlotBody({
  slot,
  progress,
  domain,
  onAnswer,
  onNext,
}: Readonly<{
  slot: Slot;
  progress: Progress;
  domain: string | null;
  onAnswer: (picked: number | number[]) => void;
  onNext: () => void;
}>) {
  const actions = gameStore.getState();
  switch (slot.kind) {
    case 'card': {
      return (
        <>
          <CardView card={slot.card} result={slot.result} onAnswer={onAnswer} onSkip={actions.skip} />
          {slot.result ? (
            <VerdictPanel card={slot.card} result={slot.result} onNext={onNext} onFlag={actions.flagWrong} />
          ) : null}
        </>
      );
    }
    case 'welcome': {
      return <WelcomeCard progress={progress} onDealIn={actions.dealIn} />;
    }
    case 'loading': {
      return <LoadingCard since={slot.since} domain={domain} />;
    }
    case 'error': {
      return <ErrorCard code={slot.code} onRetry={actions.retry} />;
    }
  }
}

export function Feed(): React.ReactNode {
  const hydrated = useGame((s) => s.hydrated);
  const game = useGame((s) => s.game);
  const toasts = useGame((s) => s.toasts);
  const actions = gameStore.getState();
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scroll = useRef({ momentum: false, atEnd: true, y: 0, height: 0, content: 0 });
  const leaving = useRef(false);

  useAppLifecycle();

  useEffect(() => {
    if (hydrated) gameStore.getState().begin();
  }, [hydrated]);

  const enter = useSharedValue(1);
  const leave = useSharedValue(0);
  const key = game ? slotKey(game.current) : 'none';
  useEffect(() => {
    leaving.current = false;
    leave.set(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (reduceMotion) {
      enter.set(1);
    } else {
      enter.set(0);
      enter.set(withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }));
    }
  }, [key, reduceMotion, enter, leave]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.get() * (1 - leave.get()),
    transform: [{ translateY: (1 - enter.get()) * 48 - leave.get() * 64 }],
  }));

  const answered = game?.current.kind === 'card' && game.current.result != null;

  /** The answered card slides up and fades, then the next one rises in. */
  const goNext = () => {
    const state = gameStore.getState().game;
    if (leaving.current || state?.current.kind !== 'card' || !state.current.result) return;
    if (reduceMotion) {
      gameStore.getState().next();
      return;
    }
    leaving.current = true;
    leave.set(withTiming(1, { duration: LEAVE_MS }));
    setTimeout(() => gameStore.getState().next(), LEAVE_MS);
  };

  const onAnswer = (picked: number | number[]) => {
    gameStore.getState().answer(picked);
    const slot = gameStore.getState().game?.current;
    if (slot?.kind === 'card' && slot.result) playHaptic(slot.result.haptic);
  };

  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetY: [-20, 20],
    failOffsetX: [-40, 40],
    onDeactivate: (e) => {
      const s = scroll.current;
      // Mid-scroll means momentum is still running or there is more card below.
      if (e.translationY <= -SWIPE_DISTANCE && canSwipeAdvance({ answered, scrolling: s.momentum || !s.atEnd }))
        goNext();
    },
  });

  const updateAtEnd = () => {
    const s = scroll.current;
    s.atEnd = s.y + s.height >= s.content - 8;
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    Object.assign(scroll.current, {
      y: contentOffset.y,
      height: layoutMeasurement.height,
      content: contentSize.height,
    });
    updateAtEnd();
  };

  if (!game) return <YStack flex={1} bg="$board" />;

  return (
    <YStack flex={1} bg="$board">
      <DotGrid />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <TopBar progress={game.progress} combo={game.combo} onMenu={() => setMenuOpen(true)} />
        <GestureDetector gesture={pan}>
          <ScrollView
            ref={scrollRef}
            simultaneousWith={pan}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48, alignItems: 'center' }}
            scrollEventThrottle={32}
            onScroll={onScroll}
            onLayout={(e) => {
              scroll.current.height = e.nativeEvent.layout.height;
              updateAtEnd();
            }}
            onContentSizeChange={(_, h) => {
              scroll.current.content = h;
              updateAtEnd();
            }}
            onMomentumScrollBegin={() => (scroll.current.momentum = true)}
            onMomentumScrollEnd={() => (scroll.current.momentum = false)}
          >
            <Animated.View style={[{ width: '100%', maxWidth: 560, gap: 12 }, cardStyle]}>
              <SlotBody
                slot={game.current}
                progress={game.progress}
                domain={game.fetch.domain}
                onAnswer={onAnswer}
                onNext={goNext}
              />
            </Animated.View>
          </ScrollView>
        </GestureDetector>
      </SafeAreaView>
      <Toasts toasts={toasts} onDone={actions.dismissToast} />
      {menuOpen ? (
        <TopicsSheet progress={game.progress} onChange={actions.setDomains} onClose={() => setMenuOpen(false)} />
      ) : null}
    </YStack>
  );
}
