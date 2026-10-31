import { z } from 'zod';

export const MAX_BODY_BYTES = 4 * 1024;

/** A flagged card carries its code and options, so the flag body gets a little more room. */
export const MAX_FLAG_BODY_BYTES = 8 * 1024;

export const deviceId = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Z0-9-]+$/i);
