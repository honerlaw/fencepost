export type CardType = 'flaw' | 'break' | 'trace' | 'model' | 'order';

export type DomainId =
  | 'reservations'
  | 'meetings'
  | 'parking'
  | 'payments'
  | 'checkout'
  | 'ratelimit'
  | 'rides'
  | 'cache'
  | 'jobs'
  | 'chat'
  | 'elevator'
  | 'library';

export interface CardBase {
  id: string;
  type: CardType;
  domain: DomainId;
  title: string;
  prompt: string;
  why: string;
  boss: boolean;
}

/** `answer` is the index of the wrong line. */
export type FlawCard = CardBase & { type: 'flaw'; code: string[]; answer: number };
export type BreakCard = CardBase & { type: 'break'; code: string[]; options: string[]; answer: number };
export type TraceCard = CardBase & {
  type: 'trace';
  code: string[];
  input?: string | undefined;
  options: string[];
  answer: number;
};
export type ModelCard = CardBase & { type: 'model'; options: string[]; answer: number };
/** `steps` are in the correct order; the client shuffles them. */
export type OrderCard = CardBase & { type: 'order'; steps: string[] };

export type Card = FlawCard | BreakCard | TraceCard | ModelCard | OrderCard;

/** Flags added on the client when a card is served; the server never sends them. */
export type PlayedCard = Card & { double?: boolean; rematch?: boolean; starter?: boolean };

export interface Progress {
  v: 1;
  xp: number;
  answered: number;
  correct: number;
  bestCombo: number;
  streak: number;
  /** Local date "YYYY-MM-DD" of the last answer. */
  lastDay: string;
  /** Rematch queue, oldest first, max 30. */
  missed: Card[];
  /** Recent card titles, max 30, sent to the server to avoid repeats. */
  recent: string[];
  /** Empty means all topics. */
  domains: DomainId[];
  starterDone: boolean;
  deviceId: string;
}

/** Random source in [0, 1). Injected so probabilities and shuffles are testable. */
export type Rng = () => number;
