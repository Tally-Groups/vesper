import { handleCallback } from '@vercel/queue';
import { prisma } from '@/src/lib/db';
import { processMeteringEventInTransaction } from '@/src/lib/metering/rollups';
import { CanonicalMeteringEventPayload } from '@/src/lib/metering/types';

export const runtime = 'nodejs';

export const POST = handleCallback(async (message: any) => {
  const payload: CanonicalMeteringEventPayload = {
    eventKey: message.eventKey,
    subjectKey: message.subjectKey,
    metricKey: message.metricKey,
    quantity: BigInt(message.quantity),
    occurredAt: new Date(message.occurredAt),
    source: message.source,
    metadata: message.metadata,
  };

  await prisma.$transaction(async (tx) => {
    await processMeteringEventInTransaction(tx, payload);
  });
});

