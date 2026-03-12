import { NextRequest } from 'next/server';
import { getLongitudinalUsage } from '@/lib/metering/get-longitudinal-usage';
import { frequencySchema } from '@/lib/metering/validators';

// RESTful longitudinal usage endpoint for a metric across subjects.
// metricKey now comes from the URL path; range, frequency, and subjectKeys stay in the query string.
export const runtime = 'edge';

type RouteParams = {
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

  let subjectKeys: string[] | undefined;
  const subjectKeysParam = searchParams.getAll('subjectKeys');
  if (subjectKeysParam && subjectKeysParam.length > 0) {
    subjectKeys = subjectKeysParam
      .flatMap((entry) => entry.split(',').map((s) => s.trim()))
      .filter((s) => s.length > 0);
  }

  const { metricKey } = context.params;

  try {
    const frequency = frequencySchema.parse(frequencyRaw);

    const result = await getLongitudinalUsage({
      metricKey,
      rangeStart,
      rangeEnd,
      frequency,
      subjectKeys,
    });

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    console.error('Error in REST /api/metrics/[metricKey]/usage/longitudinal', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
}

