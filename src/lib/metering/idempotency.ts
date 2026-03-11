import crypto from 'crypto';

interface BuildMeteringEventKeyInput {
  subjectKey: string;
  metricKey: string;
  quantity: number | bigint;
  occurredAt: Date;
  source?: string;
  metadata?: Record<string, unknown>;
  eventKey?: string;
}

// Builds a deterministic event key so the database can enforce idempotency.
export function buildMeteringEventKey(input: BuildMeteringEventKeyInput): string {
  if (input.eventKey && input.eventKey.trim().length > 0) {
    return input.eventKey;
  }

  const { subjectKey, metricKey, quantity, occurredAt, source, metadata } = input;

  const externalRef =
    metadata && typeof metadata === 'object' && 'externalRef' in metadata
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        String((metadata as any).externalRef)
      : '';

  const canonical = JSON.stringify({
    subjectKey,
    metricKey,
    quantity: quantity.toString(),
    occurredAt: occurredAt.toISOString(),
    source: source ?? '',
    externalRef,
  });

  return crypto.createHash('sha256').update(canonical).digest('hex');
}

