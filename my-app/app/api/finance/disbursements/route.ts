// app/api/finance/disbursements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const disbursements = await prisma.disbursementRequest.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(disbursements, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching disbursements queue:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
