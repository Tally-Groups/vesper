import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/db';
import { startOfDayUTC } from '@/src/lib/metering/bucketing';

export const runtime = 'nodejs';

function authorize(req: NextRequest): boolean {
  const secret = process.env.METERING_CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get('x-metering-cron-secret');
  const auth = req.headers.get('authorization');
  if (header && header === secret) return true;
  if (auth && auth === `Bearer ${secret}`) return true;
  return false;
}

interface RebuildBody {
  metricKey?: string;
  subjectKey?: string;
  rangeStart: string;
  rangeEnd: string;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: RebuildBody;
  try {
    body = (await req.json()) as RebuildBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  if (!body.rangeStart || !body.rangeEnd) {
    return new Response(JSON.stringify({ error: 'rangeStart and rangeEnd are required' }), {
      status: 400,
    });
  }

  const rangeStart = new Date(body.rangeStart);
  const rangeEnd = new Date(body.rangeEnd);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeEnd <= rangeStart) {
    return new Response(JSON.stringify({ error: 'Invalid rangeStart/rangeEnd' }), { status: 400 });
  }

  const filters: {
    metricKey?: string;
    subjectKey?: string;
  } = {};

  if (body.metricKey) filters.metricKey = body.metricKey;
  if (body.subjectKey) filters.subjectKey = body.subjectKey;

  const events = await prisma.meteringEvent.findMany({
    where: {
      occurredAt: {
        gte: rangeStart,
        lt: rangeEnd,
      },
      ...(filters.metricKey ? { metricKey: filters.metricKey } : {}),
      ...(filters.subjectKey ? { subjectKey: filters.subjectKey } : {}),
    },
  });

  // Aggregate into per-day, per-subject, per-metric and global per-day per-metric.
  const daySubjectMetric = new Map<
    string,
    { subjectKey: string; metricKey: string; bucketDate: Date; total: bigint; eventCount: bigint }
  >();
  const dayGlobal = new Map<
    string,
    { metricKey: string; bucketDate: Date; total: bigint; eventCount: bigint }
  >();

  for (const ev of events) {
    const bucketDate = startOfDayUTC(ev.occurredAt);

    const smKey = `${ev.subjectKey}::${ev.metricKey}::${bucketDate.toISOString()}`;
    const smExisting = daySubjectMetric.get(smKey) ?? {
      subjectKey: ev.subjectKey,
      metricKey: ev.metricKey,
      bucketDate,
      total: BigInt(0),
      eventCount: BigInt(0),
    };
    smExisting.total += ev.quantity;
    smExisting.eventCount += BigInt(1);
    daySubjectMetric.set(smKey, smExisting);

    const gKey = `${ev.metricKey}::${bucketDate.toISOString()}`;
    const gExisting = dayGlobal.get(gKey) ?? {
      metricKey: ev.metricKey,
      bucketDate,
      total: BigInt(0),
      eventCount: BigInt(0),
    };
    gExisting.total += ev.quantity;
    gExisting.eventCount += BigInt(1);
    dayGlobal.set(gKey, gExisting);
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (filters.metricKey && filters.subjectKey) {
      await tx.meteringRollupDay.deleteMany({
        where: {
          subjectKey: filters.subjectKey,
          metricKey: filters.metricKey,
          bucketDate: {
            gte: rangeStart,
            lt: rangeEnd,
          },
        },
      });
    } else if (filters.metricKey) {
      await tx.meteringRollupDay.deleteMany({
        where: {
          metricKey: filters.metricKey,
          bucketDate: {
            gte: rangeStart,
            lt: rangeEnd,
          },
        },
      });
    } else if (filters.subjectKey) {
      await tx.meteringRollupDay.deleteMany({
        where: {
          subjectKey: filters.subjectKey,
          bucketDate: {
            gte: rangeStart,
            lt: rangeEnd,
          },
        },
      });
    } else {
      await tx.meteringRollupDay.deleteMany({
        where: {
          bucketDate: {
            gte: rangeStart,
            lt: rangeEnd,
          },
        },
      });
    }

    if (filters.metricKey) {
      await tx.meteringGlobalRollupDay.deleteMany({
        where: {
          metricKey: filters.metricKey,
          bucketDate: {
            gte: rangeStart,
            lt: rangeEnd,
          },
        },
      });
    } else {
      await tx.meteringGlobalRollupDay.deleteMany({
        where: {
          bucketDate: {
            gte: rangeStart,
            lt: rangeEnd,
          },
        },
      });
    }

    if (daySubjectMetric.size > 0) {
      await tx.meteringRollupDay.createMany({
        data: Array.from(daySubjectMetric.values()).map((v) => ({
          subjectKey: v.subjectKey,
          metricKey: v.metricKey,
          bucketDate: v.bucketDate,
          total: v.total,
          eventCount: v.eventCount,
          updatedAt: now,
        })),
      });
    }

    if (dayGlobal.size > 0) {
      await tx.meteringGlobalRollupDay.createMany({
        data: Array.from(dayGlobal.values()).map((v) => ({
          metricKey: v.metricKey,
          bucketDate: v.bucketDate,
          total: v.total,
          eventCount: v.eventCount,
          updatedAt: now,
        })),
      });
    }
  });

  return new Response(
    JSON.stringify({
      rebuiltSubjectMetricBuckets: daySubjectMetric.size,
      rebuiltGlobalBuckets: dayGlobal.size,
    }),
    { status: 200 },
  );
}

