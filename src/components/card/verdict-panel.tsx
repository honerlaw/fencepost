import type { PlayedCard, ReviewedResult } from '@/game/types';
import { VerdictBody } from './verdict-body';

interface VerdictPanelProps {
  card: PlayedCard;
  result: ReviewedResult;
  onNext: () => void;
  onFlag: () => void;
  /** True when there is an earlier answered card to go back to. */
  canLookBack: boolean;
}

export function VerdictPanel({
  card,
  result,
  onNext,
  onFlag,
  canLookBack,
}: Readonly<VerdictPanelProps>): React.ReactNode {
  return (
    <VerdictBody
      card={card}
      result={result}
      testID="verdict"
      primary={{ label: 'Next card', onPress: onNext }}
      hint={canLookBack ? 'Swipe up for the next card, swipe right to look back' : 'Swipe up for the next card'}
      links={!result.correct && !result.flagged ? [{ label: 'Card was wrong', onPress: onFlag }] : []}
    />
  );
}
