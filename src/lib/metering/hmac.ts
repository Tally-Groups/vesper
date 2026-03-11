import crypto from 'crypto';

// Signs a raw JSON string payload with HMAC-SHA256 using the shared secret.
export function signPayload(rawBody: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody, 'utf8');
  return hmac.digest('hex');
}

interface VerifySignatureInput {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string;
  maxSkewMs?: number;
}

// Verifies a client-provided HMAC signature for ingestion.
export function verifySignature({
  rawBody,
  signature,
  timestamp,
  secret,
  maxSkewMs = 5 * 60 * 1000,
}: VerifySignatureInput): boolean {
  if (!signature || !timestamp) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;

  const now = Date.now();
  if (Math.abs(now - ts) > maxSkewMs) return false;

  const expected = signPayload(`${timestamp}.${rawBody}`, secret);

  const providedBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  if (providedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

