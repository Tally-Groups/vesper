import { prisma } from '../db';
import { GetUserUsageReceiptInput, UsageReceipt } from './types';
import { getUserUsageReceiptSchema, parseDateInput } from './validators';
import { getPeriodBounds } from './bucketing';

export async function getUserUsageReceipt(input: GetUserUsageReceiptInput): Promise<UsageReceipt> {
  const parsed = getUserUsageReceiptSchema.parse(input);
  const anchor = parseDateInput(parsed.anchorDate) ?? new Date();
  const { start, end } = getPeriodBounds(parsed.periodType, anchor);

  const rows = await prisma.meteringRollupDay.findMany({
    where: {
      subjectKey: parsed.subjectKey,
      metricKey: parsed.metricKey,
      bucketDate: {
        gte: start,
        lt: end,
      },
    },
  });

  let totalUsage = BigInt(0);
  let eventCount = BigInt(0);
  let lastAggregatedAt: Date | null = null;

  for (const row of rows) {
    totalUsage += row.total;
    eventCount += row.eventCount;
    if (!lastAggregatedAt || row.updatedAt > lastAggregatedAt) {
      lastAggregatedAt = row.updatedAt;
    }
  }

  return {
    subjectKey: parsed.subjectKey,
    metricKey: parsed.metricKey,
    periodType: parsed.periodType,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    totalUsage,
    eventCount,
    lastAggregatedAt: lastAggregatedAt ? lastAggregatedAt.toISOString() : null,
  };
}
