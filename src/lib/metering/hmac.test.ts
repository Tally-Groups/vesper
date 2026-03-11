import { describe, it, expect } from 'vitest';
import { signPayload, verifySignature } from './hmac';

describe('HMAC helpers', () => {
  const secret = 'test-secret';
  const rawBody = JSON.stringify({ foo: 'bar' });

  it('signs and verifies a payload', () => {
    const ts = Date.now().toString();
    const signature = signPayload(`${ts}.${rawBody}`, secret);
    const ok = verifySignature({ rawBody, signature, timestamp: ts, secret, maxSkewMs: 60_000 });
    expect(ok).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const ts = Date.now().toString();
    const bad = verifySignature({
      rawBody,
      signature: 'deadbeef',
      timestamp: ts,
      secret,
      maxSkewMs: 60_000,
    });
    expect(bad).toBe(false);
  });
});

