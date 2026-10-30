import { getHandlers } from '@/server/from-env';

export function POST(request: Request) {
  return getHandlers().cards(request);
}
