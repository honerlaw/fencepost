/**
 * On Fly, the edge proxy sets Fly-Client-IP to the caller's address. Anywhere else that header is
 * whatever the client sent, so it is ignored and the last X-Forwarded-For hop (the one the nearest
 * proxy appended) is used. Without any proxy in front, both headers are client-controlled.
 */
export function clientIp(request: Request, behindFly: boolean): string {
  const fly = behindFly ? request.headers.get('fly-client-ip') : null;
  return fly ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? 'unknown';
}
