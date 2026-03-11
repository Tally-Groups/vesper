import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/queue', () => ({
  send: vi.fn().mockResolvedValue({}),
}));

vi.mock('../db', () => {
  return {
    prisma: {
      $transaction: vi.fn(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          meteringEvent: {},
          meteringRollupDay: {},
          meteringGlobalRollupDay: {},
        }),
      ),
    },
  };
});

vi.mock('./rollups', () => ({
  processMeteringEventInTransaction: vi.fn().mockResolvedValue('inserted'),
}));

import { send } from '@vercel/queue';
import { prisma } from '../db';
import { processMeteringEventInTransaction } from './rollups';
import { triggerEvent } from './trigger-event';

describe('triggerEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enqueues event when processInline is false', async () => {
    const result = await triggerEvent({
      subjectKey: 'user:1',
      metricKey: 'emails_sent',
      quantity: 1,
      source: 'test',
    });

    expect(result.accepted).toBe(true);
    expect(result.eventKey).toBeTruthy();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('processes event inline when requested', async () => {
    const result = await triggerEvent({
      subjectKey: 'user:2',
      metricKey: 'emails_sent',
      quantity: 2,
      processInline: true,
    });

    expect(result.accepted).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(processMeteringEventInTransaction).toHaveBeenCalledTimes(1);
  });
});

