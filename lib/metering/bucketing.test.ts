import { describe, it, expect } from 'vitest';
import {
  startOfDayUTC,
  startOfWeekUTC,
  startOfMonthUTC,
  generateBuckets,
  getPeriodBounds,
} from './bucketing';

describe('UTC bucketing helpers', () => {
  it('computes startOfDayUTC', () => {
    const d = new Date('2024-01-02T15:30:00.000Z');
    const s = startOfDayUTC(d);
    expect(s.toISOString()).toBe('2024-01-02T00:00:00.000Z');
  });

  it('computes ISO week start (Monday)', () => {
    const wednesday = new Date('2024-01-03T10:00:00.000Z'); // Wednesday
    const monday = startOfWeekUTC(wednesday);
    expect(monday.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('computes startOfMonthUTC', () => {
    const d = new Date('2024-05-15T12:00:00.000Z');
    const s = startOfMonthUTC(d);
    expect(s.toISOString()).toBe('2024-05-01T00:00:00.000Z');
  });

  it('generates daily buckets with zero gaps', () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2024-01-04T00:00:00.000Z');
    const buckets = generateBuckets(start, end, 'day');
    expect(buckets).toHaveLength(3);
    expect(buckets[0].start.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(buckets[2].end.toISOString()).toBe('2024-01-04T00:00:00.000Z');
  });

  it('computes period bounds for day/week/month', () => {
    const anchor = new Date('2024-01-10T12:00:00.000Z');

    const day = getPeriodBounds('day', anchor);
    expect(day.start.toISOString()).toBe('2024-01-10T00:00:00.000Z');

    const week = getPeriodBounds('week', anchor);
    expect(week.start.toISOString()).toBe('2024-01-08T00:00:00.000Z'); // Monday

    const month = getPeriodBounds('month', anchor);
    expect(month.start.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });
});
