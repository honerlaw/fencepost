import { z } from 'zod';

/**
 * What the model returns. One flat, all-required object with nullable fields:
 * structured-output modes handle this far more reliably than unions. The answer
 * is named by text, not index (models get indexes wrong).
 */
export const RawCard = z.object({
  type: z.enum(['flaw', 'break', 'trace', 'model', 'order']),
  title: z.string(),
  prompt: z.string(),
  code: z.array(z.string()).nullable(),
  input: z.string().nullable(),
  options: z.array(z.string()).nullable(),
  /** Exact text of the right option (break, trace, model). */
  correct: z.string().nullable(),
  /** Exact text of the wrong line (flaw). */
  bad_line: z.string().nullable(),
  steps: z.array(z.string()).nullable(),
  why: z.string(),
});

export type RawCard = z.infer<typeof RawCard>;
