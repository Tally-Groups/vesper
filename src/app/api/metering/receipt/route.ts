import { NextRequest } from 'next/server';
import { getUserUsageReceipt } from '@/src/lib/metering/get-user-usage-receipt';
import { periodTypeSchema } from '@/src/lib/metering/validators';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const subjectKey = searchParams.get('subjectKey') ?? '';
  const metricKey = searchParams.get('metricKey') ?? '';
  const periodTypeRaw = searchParams.get('periodType') ?? '';
  const anchorDate = searchParams.get('anchorDate') ?? undefined;

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
    console.error('Error in /api/metering/receipt', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
}

