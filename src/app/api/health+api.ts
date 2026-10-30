import { getHandlers } from '@/server/from-env';

export function GET() {
  return getHandlers().health();
}
