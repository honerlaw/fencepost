import type { PlayedCard, ReviewedResult } from '@/game/types';
import { VerdictBody } from './verdict-body';

interface ReviewVerdictProps {
  card: PlayedCard;
  result: ReviewedResult;
  onBack: () => void;
  /** Set when there is a still older answered card. */
  onOlder: (() => void) | null;
  /** Set when a newer answered card sits between this one and the live card. */
  onNewer: (() => void) | null;
}

/** The verdict of a card answered earlier: nothing here can change it. */
export function ReviewVerdict({
  card,
  result,
  onBack,
  onOlder,
  onNewer,
}: Readonly<ReviewVerdictProps>): React.ReactNode {
  return (
    <VerdictBody
      card={card}
      result={result}
      testID="review-verdict"
      primary={{ label: 'Back to current card', onPress: onBack }}
      hint={
        onOlder
          ? 'Already answered. Swipe right for older cards, left for newer ones'
          : 'Already answered. Swipe left for newer cards'
      }
      links={[
        ...(onOlder ? [{ label: 'Older card', onPress: onOlder }] : []),
        ...(onNewer ? [{ label: 'Newer card', onPress: onNewer }] : []),
      ]}
    />
  );
}
