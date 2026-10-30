import { Text, XStack, YStack } from 'tamagui';

import { domainName } from '@/cards/domains';
import { Tap } from '@/components/ui/tap';
import type { AnswerResult } from '@/game/engine';
import type { PlayedCard } from '@/game/types';
import { CodeBlock } from './code-block';
import { TYPE_LABEL } from './labels';
import { Options } from './options';
import { OrderSteps } from './order-steps';

function Badge({ label, tone }: { label: string; tone: 'gold' | 'blue' }) {
  return (
    <YStack px="$2" py={2} rounded="$2" bg={tone === 'gold' ? '$goldWash' : '$blueWash'}>
      <Text fontFamily="$body" fontWeight="700" fontSize={11} letterSpacing={0.5} color={tone === 'gold' ? '$goldInk' : '$blue'}>
        {label}
      </Text>
    </YStack>
  );
}

function Body({ card, result, onAnswer }: { card: PlayedCard; result: AnswerResult | null; onAnswer: (picked: number | number[]) => void }) {
  const picked = result?.picked;
  switch (card.type) {
    case 'flaw':
      return <CodeBlock code={card.code} onPickLine={onAnswer} reveal={result ? { answer: card.answer, picked: picked as number } : null} />;
    case 'break':
      return (
        <YStack gap="$3">
          <CodeBlock code={card.code} />
          <Options options={card.options} onPick={onAnswer} reveal={result ? { answer: card.answer, picked: picked as number } : null} />
        </YStack>
      );
    case 'trace':
      return (
        <YStack gap="$3">
          {card.input ? (
            <YStack p="$3" rounded="$3" bg="$blueWash" gap="$1">
              <Text fontFamily="$body" fontWeight="700" fontSize={11} letterSpacing={1} color="$blue" textTransform="uppercase">
                Input
              </Text>
              <Text fontFamily="$body" fontSize="$4" color="$ink">
                {card.input}
              </Text>
            </YStack>
          ) : null}
          <CodeBlock code={card.code} />
          <Options options={card.options} onPick={onAnswer} reveal={result ? { answer: card.answer, picked: picked as number } : null} />
        </YStack>
      );
    case 'model':
      return <Options options={card.options} onPick={onAnswer} reveal={result ? { answer: card.answer, picked: picked as number } : null} />;
    case 'order':
      return <OrderSteps key={card.id} steps={card.steps} onDone={onAnswer} picked={result ? (picked as number[]) : null} />;
  }
}

interface CardViewProps {
  card: PlayedCard;
  result: AnswerResult | null;
  onAnswer: (picked: number | number[]) => void;
  onSkip: () => void;
}

export function CardView({ card, result, onAnswer, onSkip }: CardViewProps) {
  const face = (
    <YStack testID="card" bg="$card" rounded="$5" borderWidth={card.boss ? 2 : 1} borderColor={card.boss ? '$gold' : '$rule'} p="$4" gap="$3">
      <XStack gap="$2" items="center" flexWrap="wrap">
        <Text fontFamily="$body" fontWeight="700" fontSize={12} letterSpacing={1} color="$blue" textTransform="uppercase">
          {TYPE_LABEL[card.type]} · {domainName(card.domain)}
        </Text>
        {card.boss ? <Badge label="Boss · 3x" tone="gold" /> : null}
        {card.double ? <Badge label="2x points" tone="gold" /> : null}
        {card.rematch ? <Badge label="Rematch" tone="blue" /> : null}
      </XStack>
      <Text role="heading" fontFamily="$display" fontWeight="800" fontSize="$8" lineHeight="$8" color="$ink">
        {card.title}
      </Text>
      <Text fontFamily="$body" fontSize="$5" lineHeight="$5" color="$ink">
        {card.prompt}
      </Text>
      <Body card={card} result={result} onAnswer={onAnswer} />
      {!result ? (
        <Tap label="Skip this card" onPress={onSkip} self="center" py="$2" px="$3">
          <Text fontFamily="$body" fontSize="$3" color="$muted" textDecorationLine="underline">
            Skip this card
          </Text>
        </Tap>
      ) : null}
    </YStack>
  );
  if (!card.boss) return face;
  // Boss cards get a soft gold ring outside the gold border.
  return (
    <YStack p={4} rounded={22} bg="$goldWash">
      {face}
    </YStack>
  );
}
