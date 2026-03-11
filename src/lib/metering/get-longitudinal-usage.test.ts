import { describe, it, expect, vi } from 'vitest';

vi.mock('../db', () => ({
  prisma: {
    meteringGlobalRollupDay: {
      findMany: vi.fn().mockResolvedValue([
        {
          metricKey: 'emails_sent',
          bucketDate: new Date('2024-01-01T00:00:00.000Z'),
          total: BigInt(5),
          eventCount: BigInt(3),
          updatedAt: new Date('2024-01-01T12:00:00.000Z'),
        },
      ]),
    },
    meteringRollupDay: {
      findMany: vi.fn().mockResolvedValue([
        {
          subjectKey: 'user:1',
          metricKey: 'emails_sent',
          bucketDate: new Date('2024-01-01T00:00:00.000Z'),
          total: BigInt(2),
          eventCount: BigInt(1),
          updatedAt: new Date('2024-01-01T12:00:00.000Z'),
        },
        {
          subjectKey: 'user:2',
          metricKey: 'emails_sent',
          bucketDate: new Date('2024-01-01T00:00:00.000Z'),
          total: BigInt(3),
          eventCount: BigInt(2),
          updatedAt: new Date('2024-01-01T13:00:00.000Z'),
        },
      ]),
    },
  },
}));

import { prisma } from '../db';
import { getLongitudinalUsage } from './get-longitudinal-usage';

describe('getLongitudinalUsage', () => {
  it('uses global rollups when subjectKeys are omitted', async () => {
    const result = await getLongitudinalUsage({
      metricKey: 'emails_sent',
      rangeStart: '2024-01-01T00:00:00.000Z',
      rangeEnd: '2024-01-02T00:00:00.000Z',
      frequency: 'day',
    });

    expect(prisma.meteringGlobalRollupDay.findMany).toHaveBeenCalled();
    expect(result.subjectScope).toBe('global');
    expect(result.buckets[0].total).toBe(BigInt(5));
  });

  it('aggregates across subset of subjects when subjectKeys are provided', async () => {
    const result = await getLongitudinalUsage({
      metricKey: 'emails_sent',
      rangeStart: '2024-01-01T00:00:00.000Z',
      rangeEnd: '2024-01-02T00:00:00.000Z',
      frequency: 'day',
      subjectKeys: ['user:1', 'user:2'],
    });

    expect(prisma.meteringRollupDay.findMany).toHaveBeenCalled();
    expect(result.subjectScope).toBe('subset');
    expect(result.buckets[0].total).toBe(BigInt(5));
  });
});

