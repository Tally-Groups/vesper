import { NextRequest } from 'next/server';
import { getUserUsageReceipt } from '@/lib/metering/get-user-usage-receipt';
import { periodTypeSchema } from '@/lib/metering/validators';

// RESTful usage receipt endpoint for a specific subject and metric.
// subjectKey and metricKey now come from the URL path; period parameters stay in the query string.
export const runtime = 'edge';

type RouteParams = {
  subjectKey: string;
  metricKey: string;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  const { searchParams } = new URL(req.url);

  const periodTypeRaw = searchParams.get('periodType') ?? '';
  const anchorDate = searchParams.get('anchorDate') ?? undefined;

  const { subjectKey, metricKey } = await context.params;

  try {
    const periodType = periodTypeSchema.parse(periodTypeRaw);

    const receipt = await getUserUsageReceipt({
      subjectKey,
      metricKey,
      periodType,
      anchorDate,
    });

    return new Response(JSON.stringify(receipt), { status: 200 });
  } catch (err) {
    console.error('Error in REST /api/subjects/[subjectKey]/metrics/[metricKey]/usage/receipt', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
}

