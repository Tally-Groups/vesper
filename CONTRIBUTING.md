# Contributing to Vesper

Thanks for your interest in contributing.

## Development setup

1. Clone the repo and install dependencies with **pnpm**:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env` and set at least `DATABASE_URL`, `METERING_HMAC_SECRET`, and `METERING_CRON_SECRET`.

3. Generate the Prisma client and run migrations:

   ```bash
   pnpm exec prisma generate
   pnpm exec prisma migrate dev
   ```

## Running tests

- **Watch mode**: `pnpm test`
- **CI mode** (single run with coverage): `pnpm test:ci`

Tests live next to the code under `lib/metering/*.test.ts`. Coverage is reported for `lib/metering/**/*.ts` (excluding test files). The project enforces a **95%** coverage threshold (lines, functions, statements); `pnpm test:ci` will fail if coverage drops below that.

## Linting

```bash
pnpm lint
```

## Pull requests

1. Branch from `main` and make your changes.
2. Ensure `pnpm test:ci` and `pnpm lint` pass locally.
3. Open a PR. CI will run the same test and coverage checks; the PR must pass (including the 95% coverage gate) before merge.
4. Keep the scope focused and the commit history clear.

## Code style

- Use the existing style (TypeScript, ESLint config). Comment non-obvious logic.
- Prefer the same patterns as in `lib/metering` (e.g. Zod for input validation, relative imports within `lib`, `@/lib/` from app routes).
