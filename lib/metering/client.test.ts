import { describe, it, expect, vi, beforeAll } from 'vitest';
import { MeteringClient } from './client';

// Mock fetch only; leave globalThis.crypto untouched (read-only in Node).
const mockFetch = vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const body = (init?.body ?? '') as string;
  const parsed = JSON.parse(body || '{}');
  if (!parsed.subjectKey || !parsed.metricKey) {
    throw new Error('Missing required fields');
  }
  if (!headers['x-metering-signature'] || !headers['x-metering-timestamp']) {
    throw new Error('Missing HMAC headers');
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
    text: async () => JSON.stringify({ ok: true }),
  } as unknown as Response;
});

describe('MeteringClient', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  it('sends signed requests with required headers', async () => {
    const client = new MeteringClient({
      secret: 'test-secret',
      endpoint: '/api/metering/events',
    });

    const res = await client.triggerEvent({
      subjectKey: 'user:1',
      metricKey: 'emails_sent',
      quantity: 1,
    });

    expect(res.ok).toBe(true);
  });

  it('rejects invalid quantities', async () => {
    const client = new MeteringClient({
      secret: 'test-secret',
    });

    await expect(
      client.triggerEvent({
        subjectKey: 'user:1',
        metricKey: 'emails_sent',
        quantity: 0,
      }),
    ).rejects.toThrow();
  });
});
