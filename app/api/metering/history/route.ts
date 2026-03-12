import { NextRequest } from 'next/server';
import { getUsageHistory } from '@/lib/metering/get-usage-history';
import { frequencySchema } from '@/lib/metering/validators';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const subjectKey = searchParams.get('subjectKey') ?? '';
  const metricKey = searchParams.get('metricKey') ?? '';
  const rangeStart = searchParams.get('rangeStart') ?? '';
  const rangeEnd = searchParams.get('rangeEnd') ?? '';
  const frequencyRaw = searchParams.get('frequency') ?? '';

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
    console.error('Error in /api/metering/history', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
}
