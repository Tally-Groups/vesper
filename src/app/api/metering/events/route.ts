import { NextRequest } from 'next/server';
import { triggerEvent } from '@/src/lib/metering/trigger-event';
import { verifySignature } from '@/src/lib/metering/hmac';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const secret = process.env.METERING_HMAC_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Metering HMAC secret not configured' }), {
      status: 500,
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-metering-signature');
  const timestamp = req.headers.get('x-metering-timestamp');

  const valid = verifySignature({
    rawBody,
    signature,
    timestamp,
    secret,
  });

  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid metering signature' }), {
      status: 401,
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  try {
    const result = await triggerEvent(body as never);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    console.error('Metering event ingestion failed', err);
    return new Response(JSON.stringify({ error: 'Failed to enqueue metering event' }), {
      status: 500,
    });
  }
}

