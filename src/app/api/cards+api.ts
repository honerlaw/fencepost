import { getHandlers } from '@/server/from-env';

export function POST(request: Request): Promise<Response> {
  return getHandlers().cards(request);
}
