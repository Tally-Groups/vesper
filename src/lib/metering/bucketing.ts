import { Frequency, PeriodType } from './types';

// All bucket calculations are done in UTC so usage reports are consistent.

export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function startOfWeekUTC(date: Date): Date {
  const day = date.getUTCDay() || 7; // ISO week: Monday=1, Sunday=7
  const diff = day - 1;
  const d = startOfDayUTC(date);
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function getPeriodBounds(periodType: PeriodType, anchor: Date): { start: Date; end: Date } {
  if (periodType === 'day') {
    const start = startOfDayUTC(anchor);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }
  if (periodType === 'week') {
    const start = startOfWeekUTC(anchor);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }
  const start = startOfMonthUTC(anchor);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start, end };
}

export interface TimeBucket {
  start: Date;
  end: Date;
}

export function generateBuckets(rangeStart: Date, rangeEnd: Date, frequency: Frequency): TimeBucket[] {
  if (rangeEnd <= rangeStart) return [];

  const buckets: TimeBucket[] = [];

  let cursor =
    frequency === 'day'
      ? startOfDayUTC(rangeStart)
      : frequency === 'week'
      ? startOfWeekUTC(rangeStart)
      : startOfMonthUTC(rangeStart);

  while (cursor < rangeEnd) {
    let next: Date;
    if (frequency === 'day') {
      next = new Date(cursor);
      next.setUTCDate(next.getUTCDate() + 1);
    } else if (frequency === 'week') {
      next = new Date(cursor);
      next.setUTCDate(next.getUTCDate() + 7);
    } else {
      next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    buckets.push({
      start: cursor,
      end: next < rangeEnd ? next : rangeEnd,
    });
    cursor = next;
  }

  return buckets;
}

