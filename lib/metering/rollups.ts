import { Prisma, PrismaClient } from '@prisma/client';
import { startOfDayUTC } from './bucketing';
import { CanonicalMeteringEventPayload } from './types';

type TxClient = PrismaClient | Prisma.TransactionClient;

// Processes a single canonical metering event inside a DB transaction.
// Inserts the raw event once and updates daily and global rollups atomically.
export async function processMeteringEventInTransaction(
  tx: TxClient,
  payload: CanonicalMeteringEventPayload,
): Promise<'inserted' | 'duplicate'> {
  const bucketDate = startOfDayUTC(payload.occurredAt);
  const now = new Date();

  try {
    await tx.meteringEvent.create({
      data: {
        id: payload.eventKey,
        eventKey: payload.eventKey,
        subjectKey: payload.subjectKey,
        metricKey: payload.metricKey,
        quantity: payload.quantity,
        occurredAt: payload.occurredAt,
        ingestedAt: now,
        source: payload.source,
        // Cast metadata into Prisma's JSON input type; our domain model uses a plain Record.
        metadata: (payload.metadata ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // Duck-type on the Prisma error code so the behavior is robust in tests
    // and does not depend on the runtime Prisma error class.
    if ((err as { code?: string } | null)?.code === 'P2002') {
      // Unique constraint on eventKey -> already processed.
      return 'duplicate';
    }
    throw err;
  }

  await tx.meteringRollupDay.upsert({
    where: {
      subjectKey_metricKey_bucketDate: {
        subjectKey: payload.subjectKey,
        metricKey: payload.metricKey,
        bucketDate,
      },
    },
    create: {
      subjectKey: payload.subjectKey,
      metricKey: payload.metricKey,
      bucketDate,
      total: payload.quantity,
      eventCount: BigInt(1),
      updatedAt: now,
    },
    update: {
      total: { increment: payload.quantity },
      eventCount: { increment: BigInt(1) },
      updatedAt: now,
    },
  });

  await tx.meteringGlobalRollupDay.upsert({
    where: {
      metricKey_bucketDate: {
        metricKey: payload.metricKey,
        bucketDate,
      },
    },
    create: {
      metricKey: payload.metricKey,
      bucketDate,
      total: payload.quantity,
      eventCount: BigInt(1),
      updatedAt: now,
    },
    update: {
      total: { increment: payload.quantity },
      eventCount: { increment: BigInt(1) },
      updatedAt: now,
    },
  });

  return 'inserted';
}
