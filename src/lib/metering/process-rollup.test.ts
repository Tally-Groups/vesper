import { describe, it, expect, vi, beforeAll } from 'vitest';

// Stub Prisma client module so tests don't require a generated client.
vi.mock('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: {},
}));
import { processMeteringEventInTransaction } from './rollups';

const now = new Date('2024-01-01T12:00:00.000Z');

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

describe('processMeteringEventInTransaction', () => {
  it('treats unique violation as duplicate', async () => {
    const tx: any = {
      meteringEvent: {
        create: vi.fn().mockRejectedValue(
          Object.assign(new Error('Unique constraint'), {
            code: 'P2002',
          }),
        ),
      },
      meteringRollupDay: {},
      meteringGlobalRollupDay: {},
    };

    const result = await processMeteringEventInTransaction(tx as any, {
      eventKey: 'k1',
      subjectKey: 'user:1',
      metricKey: 'emails_sent',
      quantity: BigInt(1),
      occurredAt: new Date('2024-01-01T09:00:00.000Z'),
      source: 'test',
      metadata: {},
    });

    expect(result).toBe('duplicate');
  });

  it('inserts and upserts rollups on success', async () => {
    const create = vi.fn().mockResolvedValue({});
    const upsertRollup = vi.fn().mockResolvedValue({});
    const upsertGlobal = vi.fn().mockResolvedValue({});

    const tx: any = {
      meteringEvent: {
        create,
      },
      meteringRollupDay: {
        upsert: upsertRollup,
      },
      meteringGlobalRollupDay: {
        upsert: upsertGlobal,
      },
    };

    const result = await processMeteringEventInTransaction(tx as any, {
      eventKey: 'k2',
      subjectKey: 'user:1',
      metricKey: 'emails_sent',
      quantity: BigInt(3),
      occurredAt: new Date('2024-01-01T09:00:00.000Z'),
      source: 'test',
      metadata: {},
    });

    expect(result).toBe('inserted');
    expect(create).toHaveBeenCalledTimes(1);
    expect(upsertRollup).toHaveBeenCalledTimes(1);
    expect(upsertGlobal).toHaveBeenCalledTimes(1);
  });
});


