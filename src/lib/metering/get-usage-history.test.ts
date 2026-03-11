import { describe, it, expect, vi } from 'vitest';

vi.mock('../db', () => ({
  prisma: {
    meteringRollupDay: {
      findMany: vi.fn().mockResolvedValue([
        {
          subjectKey: 'user:1',
          metricKey: 'emails_sent',
          bucketDate: new Date('2024-01-01T00:00:00.000Z'),
          total: BigInt(1),
          eventCount: BigInt(1),
          updatedAt: new Date('2024-01-01T12:00:00.000Z'),
        },
        {
          subjectKey: 'user:1',
          metricKey: 'emails_sent',
          bucketDate: new Date('2024-01-03T00:00:00.000Z'),
          total: BigInt(2),
          eventCount: BigInt(1),
          updatedAt: new Date('2024-01-03T12:00:00.000Z'),
        },
      ]),
    },
  },
}));

import { prisma } from '../db';
import { getUsageHistory } from './get-usage-history';

describe('getUsageHistory', () => {
  it('returns zero-filled daily buckets for gaps', async () => {
    const result = await getUsageHistory({
      subjectKey: 'user:1',
      metricKey: 'emails_sent',
      rangeStart: '2024-01-01T00:00:00.000Z',
      rangeEnd: '2024-01-04T00:00:00.000Z',
      frequency: 'day',
    });

    expect(prisma.meteringRollupDay.findMany).toHaveBeenCalled();
    expect(result.buckets).toHaveLength(3);
    expect(result.buckets[0].total).toBe(BigInt(1));
    expect(result.buckets[1].total).toBe(BigInt(0)); // gap day
    expect(result.buckets[2].total).toBe(BigInt(2));
  });
});

