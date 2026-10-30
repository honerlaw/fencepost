import { describe, expect, it } from 'vitest';

import { apiUrl } from './api-url';

describe('apiUrl', () => {
  it('resolves API paths against the app origin', () => {
    expect(apiUrl('/api/cards', 'https://fencepost.fly.dev')).toBe('https://fencepost.fly.dev/api/cards');
    expect(apiUrl('/api/flag', 'http://192.168.1.20:8081')).toBe('http://192.168.1.20:8081/api/flag');
  });

  it('leaves the path relative when there is no origin', () => {
    expect(apiUrl('/api/cards', undefined)).toBe('/api/cards');
  });
});
