# Vesper

Usage metering for Next.js: ingest events, store them in Postgres, and query daily rollups, usage receipts, and time-series history. Built for Vercel (Queues + Cron) and designed for idempotent, HMAC-signed ingestion.

## Features

- **HMAC-signed ingestion** – Clients sign request bodies; the server verifies before accepting events.
- **Idempotency** – Deterministic event keys and unique constraints prevent double-counting.
- **Daily rollups** – Per-subject and global aggregates in `lib/metering` with Prisma.
- **Cleanup cron** – Optional 90-day raw event retention with a protected cleanup route.
- **Rebuild/backfill** – Internal API to rebuild rollups from raw events for repair or backfill.

## Tech stack

- **Next.js 16** (App Router), **TypeScript**, **Prisma**, **PostgreSQL**
- **Vercel** – Queues for async event processing, Cron for cleanup
- **Zod** for validation, **Vitest** for tests

## Getting started

1. **Clone and install**

   ```bash
   git clone <repo-url>
   cd vesper
   pnpm install
   ```

2. **Environment**

   Copy the example env and set required variables:

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   | -------- | ----------- |
   | `DATABASE_URL` | PostgreSQL connection string |
   | `METERING_HMAC_SECRET` | Shared secret for HMAC verification (ingestion) |
   | `METERING_CRON_SECRET` | Secret for cron/repair routes (cleanup, rebuild) |
   | `METERING_QUEUE_NAME` | Vercel Queue topic name (default: `metering-events`) |

   For local Vercel Queues, run `vercel link` and `vercel env pull` as needed.

3. **Database**

   ```bash
   pnpm exec prisma migrate dev
   ```

4. **Run**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm test` | Run tests (watch) |
| `pnpm test:ci` | Run tests once with coverage (fails if &lt; 95%) |
| `pnpm lint` | Run ESLint |

## Metering subsystem

### Architecture

- **Source of truth**: Postgres via Prisma with three tables:
  - `MeteringEvent` (raw append-only event log)
  - `MeteringRollupDay` (per-subject, per-metric daily aggregates)
  - `MeteringGlobalRollupDay` (global per-metric daily aggregates)
- **Write path**:
  - Clients sign a canonical JSON body with HMAC-SHA256 using `METERING_HMAC_SECRET`.
  - `app/api/metering/events/route.ts` verifies the HMAC on the raw body, then calls `triggerEvent` from `lib/metering/trigger-event`.
  - `triggerEvent` validates input, builds a deterministic `eventKey`, and publishes to the Vercel Queue topic (or processes inline in tests).
  - `app/api/queues/metering/route.ts` is the queue consumer; it runs a single DB transaction that inserts the raw event and updates daily and global rollups.
- **Read path** (implemented in `lib/metering/`):
  - `getUserUsageReceipt` – totals for a subject/metric over a day, week, or month.
  - `getUsageHistory` – zero-filled daily/weekly/monthly time series for one subject and metric.
  - `getLongitudinalUsage` – zero-filled time series across all subjects (global) or a subset.

### Idempotency model

- **Deterministic event keys**: `buildMeteringEventKey` (in `lib/metering/idempotency`) prefers a caller-supplied `eventKey`; otherwise it hashes a canonical JSON of the event fields. `MeteringEvent.eventKey` is unique, so duplicate queue deliveries are rejected by Postgres.
- **Transactional rollups**: One transaction inserts the raw event and upserts daily and global rollups. On unique constraint violation, the handler treats the message as a duplicate and exits without double-counting.

### HMAC verification

- **Client → server only**: Clients send `x-metering-signature` and `x-metering-timestamp`; the server recomputes the HMAC over `${timestamp}.${rawBody}` and uses constant-time comparison. Invalid or stale requests are rejected before any queuing or DB writes.
- The metering system does not sign responses; verification is ingress-only.

### Cleanup

- Raw events are retained for 90 days. `app/api/internal/metering/cleanup/route.ts` is protected by `METERING_CRON_SECRET` and deletes old events in batches. `vercel.json` configures a daily Cron at 03:17 UTC to call this route.
- Daily rollups are kept indefinitely unless you add pruning.

### Extension points

- **Metrics/subjects**: `subjectKey` and `metricKey` are opaque strings; use them for users, workspaces, orgs, or global aggregates without schema changes.
- **Billing**: Add a billing module that calls `getUserUsageReceipt`, `getUsageHistory`, and `getLongitudinalUsage` and applies pricing or allowances.
- **Rebuild**: `app/api/internal/metering/rebuild/route.ts` can rebuild rollups from raw events for a subject+metric, a metric, a subject, or a date range. Protected by `METERING_CRON_SECRET`.

## License

MIT. See [LICENSE](LICENSE).
