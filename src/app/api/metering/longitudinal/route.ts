import { NextRequest } from 'next/server';
import { getLongitudinalUsage } from '@/src/lib/metering/get-longitudinal-usage';
import { frequencySchema } from '@/src/lib/metering/validators';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const metricKey = searchParams.get('metricKey') ?? '';
  const rangeStart = searchParams.get('rangeStart') ?? '';
  const rangeEnd = searchParams.get('rangeEnd') ?? '';
  const frequencyRaw = searchParams.get('frequency') ?? '';

  let subjectKeys: string[] | undefined;
  const subjectKeysParam = searchParams.getAll('subjectKeys');
  if (subjectKeysParam && subjectKeysParam.length > 0) {
    subjectKeys = subjectKeysParam.flatMap((entry) => entry.split(',').map((s) => s.trim())).filter(
      (s) => s.length > 0,
    );
  }

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
    console.error('Error in /api/metering/longitudinal', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
}

