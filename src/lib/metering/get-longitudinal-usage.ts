import { prisma } from '../db';
import {
  GetLongitudinalUsageInput,
  LongitudinalUsageResult,
  LongitudinalUsageBucket,
} from './types';
import { historyRangeSchema } from './validators';
import { generateBuckets, startOfDayUTC } from './bucketing';

export async function getLongitudinalUsage(
  input: GetLongitudinalUsageInput,
): Promise<LongitudinalUsageResult> {
  const rangeParsed = historyRangeSchema.parse({
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    frequency: input.frequency,
  });

  const rangeStart = new Date(rangeParsed.rangeStart);
  const rangeEnd = new Date(rangeParsed.rangeEnd);

  const subjectScope = input.subjectKeys && input.subjectKeys.length > 0 ? 'subset' : 'global';

  if (subjectScope === 'global') {
    const dailyRows = await prisma.meteringGlobalRollupDay.findMany({
      where: {
        metricKey: input.metricKey,
        bucketDate: {
          gte: startOfDayUTC(rangeStart),
          lt: rangeEnd,
        },
      },
    });

    const dailyMap = new Map<string, { total: bigint; eventCount: bigint }>();
    for (const row of dailyRows) {
      const key = startOfDayUTC(row.bucketDate).toISOString();
      const existing = dailyMap.get(key) ?? { total: BigInt(0), eventCount: BigInt(0) };
      dailyMap.set(key, {
        total: existing.total + row.total,
        eventCount: existing.eventCount + row.eventCount,
      });
    }

    const bucketsDef = generateBuckets(rangeStart, rangeEnd, input.frequency);
    const buckets: LongitudinalUsageBucket[] = bucketsDef.map((b) => {
      let total = BigInt(0);
      let eventCount = BigInt(0);

      for (const [dayKey, value] of dailyMap.entries()) {
        const day = new Date(dayKey);
        if (day >= b.start && day < b.end) {
          total += value.total;
          eventCount += value.eventCount;
        }
      }

      return {
        bucketStart: b.start.toISOString(),
        bucketEnd: b.end.toISOString(),
        total,
        eventCount,
      };
    });

    return {
      metricKey: input.metricKey,
      frequency: input.frequency,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      subjectScope,
      buckets,
    };
  }

  const dailyRows = await prisma.meteringRollupDay.findMany({
    where: {
      metricKey: input.metricKey,
      subjectKey: { in: input.subjectKeys },
      bucketDate: {
        gte: startOfDayUTC(rangeStart),
        lt: rangeEnd,
      },
    },
  });

  const dailyMap = new Map<string, { total: bigint; eventCount: bigint }>();
  for (const row of dailyRows) {
    const key = startOfDayUTC(row.bucketDate).toISOString();
    const existing = dailyMap.get(key) ?? { total: BigInt(0), eventCount: BigInt(0) };
    dailyMap.set(key, {
      total: existing.total + row.total,
      eventCount: existing.eventCount + row.eventCount,
    });
  }

  const bucketsDef = generateBuckets(rangeStart, rangeEnd, input.frequency);
  const buckets: LongitudinalUsageBucket[] = bucketsDef.map((b) => {
    let total = BigInt(0);
    let eventCount = BigInt(0);

    for (const [dayKey, value] of dailyMap.entries()) {
      const day = new Date(dayKey);
      if (day >= b.start && day < b.end) {
        total += value.total;
        eventCount += value.eventCount;
      }
    }

    return {
      bucketStart: b.start.toISOString(),
      bucketEnd: b.end.toISOString(),
      total,
      eventCount,
    };
  });

  return {
    metricKey: input.metricKey,
    frequency: input.frequency,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    subjectScope,
    buckets,
  };
}

