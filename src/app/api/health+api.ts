import { getHandlers } from '@/server/from-env';

export function GET(): Promise<Response> {
  return getHandlers().health();
}
