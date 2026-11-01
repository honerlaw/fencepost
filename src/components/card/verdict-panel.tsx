import type { PlayedCard, ReviewedResult } from '@/game/types';
import { VerdictBody } from './verdict-body';

interface VerdictPanelProps {
  card: PlayedCard;
  result: ReviewedResult;
  onNext: () => void;
  onFlag: () => void;
  /** Set when there is an earlier answered card to go back to. */
  onPrevious: (() => void) | null;
}

export function VerdictPanel({
  card,
  result,
  onNext,
  onFlag,
  onPrevious,
}: Readonly<VerdictPanelProps>): React.ReactNode {
  const links = [
    ...(onPrevious ? [{ label: 'Previous card', onPress: onPrevious }] : []),
    ...(!result.correct && !result.flagged ? [{ label: 'Card was wrong', onPress: onFlag }] : []),
  ];
  return (
    <VerdictBody
      card={card}
      result={result}
      testID="verdict"
      primary={{ label: 'Next card', onPress: onNext }}
      hint={onPrevious ? 'Swipe up for the next card, swipe right to look back' : 'Swipe up for the next card'}
      links={links}
    />
  );
}
