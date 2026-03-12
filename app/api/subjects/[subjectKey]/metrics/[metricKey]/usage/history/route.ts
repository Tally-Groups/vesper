import { NextRequest } from 'next/server';
import { getUsageHistory } from '@/lib/metering/get-usage-history';
import { frequencySchema } from '@/lib/metering/validators';

// RESTful usage history endpoint for a specific subject and metric.
// subjectKey and metricKey now come from the URL path; range and frequency stay in the query string.
export const runtime = 'edge';

type RouteParams = {
  subjectKey: string;
  metricKey: string;
};

export async function GET(
  req: NextRequest,
  context: { params: RouteParams },
) {
  const { searchParams } = new URL(req.url);

  const rangeStart = searchParams.get('rangeStart') ?? '';
  const rangeEnd = searchParams.get('rangeEnd') ?? '';
  const frequencyRaw = searchParams.get('frequency') ?? '';

  const { subjectKey, metricKey } = context.params;

  try {
    const frequency = frequencySchema.parse(frequencyRaw);

    const result = await getUsageHistory({
      subjectKey,
      metricKey,
      rangeStart,
      rangeEnd,
      frequency,
    });

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    console.error('Error in REST /api/subjects/[subjectKey]/metrics/[metricKey]/usage/history', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
}

