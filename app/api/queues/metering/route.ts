import { handleCallback } from '@vercel/queue';
import { prisma } from '@/lib/db';
import { processMeteringEventInTransaction } from '@/lib/metering/rollups';
import { CanonicalMeteringEventPayload } from '@/lib/metering/types';

export const runtime = 'nodejs';

export const POST = handleCallback(async (message: any | any[]) => {
  const messages = Array.isArray(message) ? message : [message];

  await prisma.$transaction(async (tx) => {
    for (const item of messages) {
      const payload: CanonicalMeteringEventPayload = {
        eventKey: item.eventKey,
        subjectKey: item.subjectKey,
        metricKey: item.metricKey,
        quantity: BigInt(item.quantity),
        occurredAt: new Date(item.occurredAt),
        source: item.source,
        metadata: item.metadata,
      };

      await processMeteringEventInTransaction(tx, payload);
    }
  });
});
