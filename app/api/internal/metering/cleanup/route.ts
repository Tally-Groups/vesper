import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const BATCH_SIZE = 5000;
const MAX_BATCHES = 10;

function authorize(req: NextRequest): boolean {
  const secret = process.env.METERING_CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get('x-metering-cron-secret');
  const auth = req.headers.get('authorization');
  if (header && header === secret) return true;
  if (auth && auth === `Bearer ${secret}`) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  let totalDeleted = 0;

  for (let i = 0; i < MAX_BATCHES; i++) {
    const oldEvents = await prisma.meteringEvent.findMany({
      where: {
        ingestedAt: {
          lt: cutoff,
        },
      },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (oldEvents.length === 0) break;

    const deleted = await prisma.meteringEvent.deleteMany({
      where: {
        id: {
          in: oldEvents.map((e) => e.id),
        },
      },
    });

    totalDeleted += deleted.count;

    if (oldEvents.length < BATCH_SIZE) break;
  }

  return new Response(JSON.stringify({ deleted: totalDeleted }), { status: 200 });
}
