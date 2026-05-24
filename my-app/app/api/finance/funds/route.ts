// app/api/finance/funds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Forces Next.js to fetch fresh calculation rates on every call
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Fetch all funds, including their historical transactions ordered newest first
    const funds = await prisma.fund.findMany({
      include: {
        transactions: {
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Structure our response package neatly for your dashboard front-end
    const fundLedger = funds.map((fund) => ({
      id: fund.id,
      name: fund.name,
      code: fund.code,
      currentBalance: fund.balance,
      totalTransactionsCount: fund.transactions.length,
      history: fund.transactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        type: tx.type,
        description: tx.description,
        referenceId: tx.referenceId,
        date: tx.timestamp.toISOString(),
      })),
    }));

    return NextResponse.json(fundLedger, { status: 200 });
  } catch (error) {
    console.error('❌ Error fetching fund ledgers:', error);
    return NextResponse.json(
      { error: 'Internal Server Error failed to read ledger values.' },
      { status: 500 }
    );
  }
}