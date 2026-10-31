import type { DomainId } from '@/game/types';

export interface Domain {
  id: DomainId;
  name: string;
  /** Goes into the generation prompt. */
  blurb: string;
}

export const DOMAINS: readonly Domain[] = [
  {
    id: 'reservations',
    name: 'Restaurant reservations',
    blurb: 'tables with seat counts, time slots, party sizes, holds, cancellations, no-shows and walk-ins',
  },
  {
    id: 'meetings',
    name: 'Meeting rooms',
    blurb: 'room capacity and equipment, overlapping bookings, weekly recurring meetings, time zones',
  },
  {
    id: 'parking',
    name: 'Parking garage',
    blurb: 'spot sizes, entry and exit gates, hourly billing, grace periods, lost tickets, a full lot',
  },
  {
    id: 'payments',
    name: 'Payments and refunds',
    blurb: 'authorize and capture, partial refunds, retries, idempotency keys, rounding cents',
  },
  {
    id: 'checkout',
    name: 'Inventory and checkout',
    blurb: 'stock counts, carts, holding stock during checkout, overselling, expiring holds',
  },
  {
    id: 'ratelimit',
    name: 'Rate limiter',
    blurb: 'fixed and sliding windows, token buckets, per-user keys, bursts, window edges',
  },
  {
    id: 'rides',
    name: 'Ride matching',
    blurb: 'drivers and riders, nearest available driver, cancellations, double assignment, surge pricing',
  },
  { id: 'cache', name: 'Cache with expiry', blurb: 'TTLs, LRU eviction, stale reads, cache stampedes, invalidation' },
  {
    id: 'jobs',
    name: 'Job scheduler',
    blurb: 'cron-style schedules, retries with backoff, at-least-once delivery, deduplication, missed runs',
  },
  {
    id: 'chat',
    name: 'Chat delivery',
    blurb: 'message ordering, read receipts, offline delivery, edits and deletes, unread counts',
  },
  {
    id: 'elevator',
    name: 'Elevator controller',
    blurb: 'call requests, travel direction, stop scheduling, capacity, doors',
  },
  { id: 'library', name: 'Library holds', blurb: 'copies, hold queues, due dates, renewals, late fines' },
];

export const DOMAIN_IDS: readonly DomainId[] = DOMAINS.map((d) => d.id);

export function isDomainId(value: unknown): value is DomainId {
  return typeof value === 'string' && (DOMAIN_IDS as readonly string[]).includes(value);
}

export function domainName(id: DomainId): string {
  return DOMAINS.find((d) => d.id === id)?.name ?? id;
}

export function getDomain(id: DomainId): Domain {
  const domain = DOMAINS.find((d) => d.id === id);
  if (!domain) throw new Error(`Unknown domain: ${id}`);
  return domain;
}
