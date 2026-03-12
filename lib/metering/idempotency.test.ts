import { describe, it, expect } from 'vitest';
import { buildMeteringEventKey } from './idempotency';

describe('buildMeteringEventKey', () => {
  it('uses provided eventKey when present', () => {
    const key = buildMeteringEventKey({
      subjectKey: 'user:1',
      metricKey: 'emails_sent',
      quantity: 1,
      occurredAt: new Date('2024-01-01T00:00:00.000Z'),
      eventKey: 'custom-key',
    });
    expect(key).toBe('custom-key');
  });

  it('produces deterministic hash when eventKey is not provided', () => {
    const baseArgs = {
      subjectKey: 'user:1',
      metricKey: 'emails_sent',
      quantity: 1,
      occurredAt: new Date('2024-01-01T00:00:00.000Z'),
      source: 'test',
      metadata: { externalRef: 'abc123' },
    } as const;

    const k1 = buildMeteringEventKey(baseArgs);
    const k2 = buildMeteringEventKey(baseArgs);

    expect(k1).toBe(k2);
    expect(k1).toHaveLength(64);
  });
});
