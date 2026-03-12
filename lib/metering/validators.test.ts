import { describe, it, expect } from 'vitest';
import { historyRangeSchema, parseDateInput } from './validators';

describe('validators', () => {
  it('parses valid date inputs', () => {
    const d = parseDateInput('2024-01-01T00:00:00.000Z');
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns null for invalid date inputs', () => {
    expect(parseDateInput('not-a-date')).toBeNull();
  });

  it('rejects inverted ranges', () => {
    const res = historyRangeSchema.safeParse({
      rangeStart: '2024-01-02T00:00:00.000Z',
      rangeEnd: '2024-01-01T00:00:00.000Z',
      frequency: 'day',
    });
    expect(res.success).toBe(false);
  });

  it('rejects overly long daily ranges', () => {
    const res = historyRangeSchema.safeParse({
      rangeStart: '2020-01-01T00:00:00.000Z',
      rangeEnd: '2025-01-01T00:00:00.000Z',
      frequency: 'day',
    });
    expect(res.success).toBe(false);
  });

  it('accepts valid monthly ranges', () => {
    const res = historyRangeSchema.safeParse({
      rangeStart: '2020-01-01T00:00:00.000Z',
      rangeEnd: '2029-01-01T00:00:00.000Z',
      frequency: 'month',
    });
    expect(res.success).toBe(true);
  });
});
