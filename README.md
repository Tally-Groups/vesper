This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Metering subsystem

### Architecture

- **Source of truth**: Postgres via Prisma with three tables:
  - `MeteringEvent` (raw append-only event log)
  - `MeteringRollupDay` (per-subject, per-metric daily aggregates)
  - `MeteringGlobalRollupDay` (global per-metric daily aggregates)
- **Write path**:
  - Clients sign a canonical JSON body with HMAC-SHA256 using `METERING_HMAC_SECRET`.
  - `/api/metering/events` verifies the HMAC on the raw body, then calls `triggerEvent`.
  - `triggerEvent` validates input, builds a deterministic `eventKey`, and publishes to the Vercel Queue topic `metering-events` (or processes inline in tests).
  - `/api/queues/metering` is the queue consumer; it runs a single DB transaction that inserts the raw event and updates daily and global rollups.
- **Read path**:
  - `getUserUsageReceipt` reads from `MeteringRollupDay` to return totals for a subject/metric over a day, week, or month.
  - `getUsageHistory` returns zero-filled daily/weekly/monthly time series for one subject and metric.
  - `getLongitudinalUsage` returns zero-filled time series across all subjects (global) or a provided set of subject keys.

### Idempotency model

- **Deterministic event keys**:
  - `buildMeteringEventKey` prefers a caller-supplied `eventKey`.
  - Otherwise it hashes a canonical JSON of `subjectKey`, `metricKey`, `quantity`, `occurredAt`, `source`, and optional `metadata.externalRef`.
  - `MeteringEvent.eventKey` is unique, so duplicate deliveries from the queue are rejected by Postgres, not app logic.
- **Transactional rollups**:
  - If the `MeteringEvent` insert succeeds, the same transaction upserts daily and global rollups and increments `total` and `eventCount`.
  - If the insert fails with a unique constraint error, the handler treats the message as a safe duplicate and exits without double-counting.

### HMAC verification model

- **Client → server only**:
  - Clients compute `signPayload(`${timestamp}.${rawBody}`, METERING_HMAC_SECRET)` and send it as `x-metering-signature` plus `x-metering-timestamp`.
  - `/api/metering/events` recomputes the HMAC over the raw body and timestamp and uses a constant‑time comparison.
  - Requests with invalid signatures or stale timestamps are rejected before any queuing or DB writes occur.
- **No server → client verification**:
  - The metering system never sends signed messages back to clients; all verification is ingress-only.

### Cleanup strategy

- **Raw event retention**:
  - Raw events are kept for 90 days to support repair/rebuild operations.
  - `/api/internal/metering/cleanup` is a protected route that:
    - Authorizes via `METERING_CRON_SECRET` (header or bearer token).
    - Deletes `MeteringEvent` rows older than 90 days in bounded batches.
  - `vercel.json` configures a daily Vercel Cron at 03:17 UTC that calls this route.
- **Rollups**:
  - Daily rollups are kept indefinitely by default; you can add pruning later if needed.

### Extension points

- **Additional metrics / subjects**:
  - `subjectKey` and `metricKey` are opaque strings; you can represent users, workspaces, orgs, or global aggregates without schema changes.
- **Billing & plans**:
  - Add a separate billing module that consumes the existing read API (`getUserUsageReceipt`, `getUsageHistory`, `getLongitudinalUsage`) and applies allowances or pricing logic.
- **Custom rebuilds**:
  - `/api/internal/metering/rebuild` can rebuild rollups from raw events for:
    - A single subject + metric,
    - A specific metric across all subjects,
    - A specific subject across all metrics,
    - Or a wider scope over a given time range.
  - This route is also protected by `METERING_CRON_SECRET` and is intended for internal repair/backfill tasks.

