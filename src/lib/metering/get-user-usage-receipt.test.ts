import { describe, it, expect, vi } from 'vitest';

vi.mock('../db', () => ({
  prisma: {
    meteringRollupDay: {
      findMany: vi.fn().mockResolvedValue([
        {
          subjectKey: 'user:1',
          metricKey: 'emails_sent',
          bucketDate: new Date('2024-01-01T00:00:00.000Z'),
          total: BigInt(2),
          eventCount: BigInt(2),
          updatedAt: new Date('2024-01-01T12:00:00.000Z'),
        },
        {
          subjectKey: 'user:1',
          metricKey: 'emails_sent',
          bucketDate: new Date('2024-01-02T00:00:00.000Z'),
          total: BigInt(3),
          eventCount: BigInt(1),
          updatedAt: new Date('2024-01-02T12:00:00.000Z'),
        },
      ]),
    },
  },
}));

import { prisma } from '../db';
import { getUserUsageReceipt } from './get-user-usage-receipt';

describe('getUserUsageReceipt', () => {
  it('aggregates totals and lastAggregatedAt', async () => {
    const receipt = await getUserUsageReceipt({
      subjectKey: 'user:1',
      metricKey: 'emails_sent',
      periodType: 'day',
      anchorDate: '2024-01-01T00:00:00.000Z',
    });

    expect(prisma.meteringRollupDay.findMany).toHaveBeenCalled();
    expect(receipt.totalUsage).toBe(BigInt(5));
    expect(receipt.eventCount).toBe(BigInt(3));
    expect(receipt.lastAggregatedAt).toBe('2024-01-02T12:00:00.000Z');
  });
});

