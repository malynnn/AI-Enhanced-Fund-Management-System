// app/api/finance/petty-cash/[id]/route.ts
// FS-006 AC4: Single petty cash transaction detail
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditLog } from '@/lib/withAuditLog';

// GET /api/finance/petty-cash/:id
async function getHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const transaction = await prisma.pettyCashTransaction.findUnique({
      where: { id },
      include: {
        voucher: {
          select: {
            voucherNumber: true,
            payee: true,
            purpose: true,
            amount: true,
            status: true,
            accountCode: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Petty cash transaction not found' }, { status: 404 });
    }

    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error('❌ Failed to fetch petty cash transaction:', error);
    return NextResponse.json({ error: 'Failed to fetch petty cash transaction' }, { status: 500 });
  }
}

export const GET = withAuditLog(getHandler, 'petty_cash_transactions');
