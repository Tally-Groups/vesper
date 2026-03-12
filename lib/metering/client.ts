// Lightweight client-side SDK for metering ingestion.
// You can copy this file into any Next.js project and adjust the endpoint path as needed.

export interface MeteringClientOptions {
  /**
   * Shared HMAC secret. In browser environments you should *not* embed this directly;
   * instead, call a server-side function that uses the same signing logic.
   * This client is primarily intended for trusted server-to-server usage or for
   * copying into your own secure server actions.
   */
  secret: string;
  /**
   * Absolute or relative URL of the ingestion endpoint.
   * Defaults to `/api/metering/events`.
   */
  endpoint?: string;
}

export interface MeteringEventPayload {
  subjectKey: string;
  metricKey: string;
  quantity: number;
  occurredAt?: string | Date;
  source?: string;
  metadata?: Record<string, unknown>;
  eventKey?: string;
}

// Node.js-style HMAC signing using SubtleCrypto for browser/server compatibility.
async function signPayload(rawBody: string, timestamp: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const data = enc.encode(`${timestamp}.${rawBody}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const bytes = new Uint8Array(signature);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class MeteringClient {
  private endpoint: string;
  private secret: string;

  constructor(options: MeteringClientOptions) {
    if (!options.secret) {
      throw new Error('MeteringClient requires a non-empty secret');
    }
    this.secret = options.secret;
    this.endpoint = options.endpoint ?? '/api/metering/events';
  }

  /**
   * Triggers a metering event by POSTing to the ingestion endpoint with
   * HMAC headers (`x-metering-signature` and `x-metering-timestamp`).
   */
  async triggerEvent(event: MeteringEventPayload): Promise<Response> {
    if (!event.subjectKey || !event.metricKey) {
      throw new Error('subjectKey and metricKey are required');
    }
    if (!Number.isInteger(event.quantity) || event.quantity <= 0) {
      throw new Error('quantity must be a positive integer');
    }

    const body = {
      ...event,
      occurredAt:
        typeof event.occurredAt === 'string' || event.occurredAt instanceof Date
          ? new Date(event.occurredAt).toISOString()
          : undefined,
    };

    const rawBody = JSON.stringify(body);
    const timestamp = Date.now().toString();
    const signature = await signPayload(rawBody, timestamp, this.secret);

    return fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-metering-signature': signature,
        'x-metering-timestamp': timestamp,
      },
      body: rawBody,
    });
  }
}
