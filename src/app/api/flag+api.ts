import { getHandlers } from '@/server/from-env';

export function POST(request: Request): Promise<Response> {
  return getHandlers().flag(request);
}
