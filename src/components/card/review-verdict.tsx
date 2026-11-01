import type { PlayedCard, ReviewedResult } from '@/game/types';
import { VerdictBody } from './verdict-body';

interface ReviewVerdictProps {
  card: PlayedCard;
  result: ReviewedResult;
  onBack: () => void;
  /** Set when there is a still older answered card. */
  onOlder: (() => void) | null;
}

/** The verdict of a card answered earlier: nothing here can change it. */
export function ReviewVerdict({ card, result, onBack, onOlder }: Readonly<ReviewVerdictProps>): React.ReactNode {
  return (
    <VerdictBody
      card={card}
      result={result}
      testID="review-verdict"
      primary={{ label: 'Back to current card', onPress: onBack }}
      hint="Already answered. Swipe right for older cards, left for newer ones"
      links={onOlder ? [{ label: 'Older card', onPress: onOlder }] : []}
    />
  );
}
