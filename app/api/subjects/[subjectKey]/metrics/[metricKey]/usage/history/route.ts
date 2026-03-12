import { NextRequest } from 'next/server';
import { getUsageHistory } from '@/lib/metering/get-usage-history';
import { jsonBigIntReplacer } from '@/lib/metering/json';
import { frequencySchema } from '@/lib/metering/validators';

// RESTful usage history endpoint for a specific subject and metric.
// Uses the Node.js runtime because it depends on Prisma Client, which is not supported on the edge runtime.
export const runtime = 'nodejs';

type RouteParams = {
  subjectKey: string;
  metricKey: string;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  const { searchParams } = new URL(req.url);

  const rangeStart = searchParams.get('rangeStart') ?? '';
  const rangeEnd = searchParams.get('rangeEnd') ?? '';
  const frequencyRaw = searchParams.get('frequency') ?? '';

  const { subjectKey, metricKey } = await context.params;

  try {
    const frequency = frequencySchema.parse(frequencyRaw);

    const result = await getUsageHistory({
      subjectKey,
      metricKey,
      rangeStart,
      rangeEnd,
      frequency,
    });

    return new Response(JSON.stringify(result, jsonBigIntReplacer), { status: 200 });
  } catch (err) {
    console.error('Error in REST /api/subjects/[subjectKey]/metrics/[metricKey]/usage/history', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
}

