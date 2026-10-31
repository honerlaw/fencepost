import { storage } from './instance';

/** Writes pending progress now (backgrounding, page hide). */
export const flushProgress = (): Promise<void> => storage.flush();
