import { NextRequest } from 'next/server';
import { triggerEvent } from '@/lib/metering/trigger-event';
import { verifySignature } from '@/lib/metering/hmac';
import type { TriggerEventInput } from '@/lib/metering/types';

// RESTful metering event ingestion endpoint for a specific subject and metric.
// This keeps the existing HMAC verification and event processing pipeline,
// but moves subjectKey/metricKey into the URL path instead of the JSON body.
export const runtime = 'nodejs';

type RouteParams = {
  subjectKey: string;
  metricKey: string;
};

export async function POST(
  req: NextRequest,
  context: { params: RouteParams },
) {
  const secret = process.env.METERING_HMAC_SECRET;
  if (!secret) {
    console.error('[METERING HMAC] Missing METERING_HMAC_SECRET');
    return new Response(JSON.stringify({ error: 'Metering HMAC secret not configured' }), {
      status: 500,
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-metering-signature');
  const timestamp = req.headers.get('x-metering-timestamp');

  console.log('[METERING HMAC] Incoming request (REST events)', {
    hasSecret: !!secret,
    secretPrefix: secret.slice(0, 4),
    timestamp,
    signature,
    rawBodyLength: rawBody.length,
  });

  const valid = verifySignature({
    rawBody,
    signature,
    timestamp,
    secret,
  });

  if (!valid) {
    console.warn('[METERING HMAC] Invalid signature', {
      timestamp,
      signature,
      rawBodySample: rawBody.slice(0, 200),
    });
    return new Response(JSON.stringify({ error: 'Invalid metering signature' }), {
      status: 401,
    });
  }

  let body: {
    quantity?: number;
    occurredAt?: string | Date;
    source?: string;
    metadata?: Record<string, unknown>;
    eventKey?: string;
    processInline?: boolean;
  };

  try {
    body = (JSON.parse(rawBody) ?? {}) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { subjectKey, metricKey } = context.params;

  const input: TriggerEventInput = {
    subjectKey,
    metricKey,
    quantity: body.quantity as number,
    occurredAt: body.occurredAt,
    source: body.source,
    metadata: body.metadata,
    eventKey: body.eventKey,
    processInline: body.processInline,
  };

  try {
    const result = await triggerEvent(input);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    console.error('Metering event ingestion failed (REST events)', err);
    return new Response(JSON.stringify({ error: 'Failed to enqueue metering event' }), {
      status: 500,
    });
  }
}

