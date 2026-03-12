import { send } from '@vercel/queue';
import { prisma } from '../db';
import { TriggerEventInput, TriggerEventResult, CanonicalMeteringEventPayload } from './types';
import { triggerEventSchema, parseDateInput } from './validators';
import { buildMeteringEventKey } from './idempotency';
import { processMeteringEventInTransaction } from './rollups';

const QUEUE_NAME = process.env.METERING_QUEUE_NAME ?? 'metering-events';

export async function triggerEvent(input: TriggerEventInput): Promise<TriggerEventResult> {
  const parsed = triggerEventSchema.parse(input);

  const occurredAt =
    parseDateInput(parsed.occurredAt) ??
    // Default to now in UTC for caller convenience; caller should pass explicit time when possible.
    new Date();

  const quantityBigInt = BigInt(parsed.quantity);

  const eventKey = buildMeteringEventKey({
    subjectKey: parsed.subjectKey,
    metricKey: parsed.metricKey,
    quantity: quantityBigInt,
    occurredAt,
    source: parsed.source,
    metadata: parsed.metadata,
    eventKey: parsed.eventKey,
  });

  const canonicalPayload: CanonicalMeteringEventPayload = {
    eventKey,
    subjectKey: parsed.subjectKey,
    metricKey: parsed.metricKey,
    quantity: quantityBigInt,
    occurredAt,
    source: parsed.source,
    metadata: parsed.metadata,
  };

  const queuedAt = new Date();

  if (input.processInline) {
    await prisma.$transaction(async (tx) => {
      await processMeteringEventInTransaction(tx, canonicalPayload);
    });
  } else {
    await send(QUEUE_NAME, {
      ...canonicalPayload,
      quantity: canonicalPayload.quantity.toString(),
      occurredAt: canonicalPayload.occurredAt.toISOString(),
    });
  }

  return {
    accepted: true,
    eventKey,
    queuedAt: queuedAt.toISOString(),
  };
}
