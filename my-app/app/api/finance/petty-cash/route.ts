// app/api/finance/petty-cash/route.ts
// FS-006 AC4: Petty cash fund sub-ledger
// Tracks replenishments, disbursements, and current balance separately
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditLog } from '@/lib/withAuditLog';

export const dynamic = 'force-dynamic';

// GET /api/finance/petty-cash
// Returns the full petty cash sub-ledger with current balance
async function getHandler(req: NextRequest) {
  try {
    const transactions = await prisma.pettyCashTransaction.findMany({
      orderBy: { transactedAt: 'desc' },
      include: {
        voucher: {
          select: {
            voucherNumber: true,
            payee: true,
            purpose: true,
            status: true,
          },
        },
      },
    });

    // Current balance is the runningBalance of the most recent transaction
    const currentBalance = transactions.length > 0 ? transactions[0].runningBalance : 0;

    // Summary stats
    const totalReplenishments = transactions
      .filter((t) => t.type === 'REPLENISHMENT')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDisbursements = transactions
      .filter((t) => t.type === 'DISBURSEMENT')
      .reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json(
      {
        currentBalance,
        totalReplenishments,
        totalDisbursements,
        transactionCount: transactions.length,
        transactions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Failed to fetch petty cash ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch petty cash ledger' }, { status: 500 });
  }
}

// POST /api/finance/petty-cash
// Body: { type: "REPLENISHMENT" | "DISBURSEMENT", amount, description, referenceVoucherId? }
async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, amount, description, referenceVoucherId } = body;

    // Validation
    if (!type || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, amount, description' },
        { status: 400 }
      );
    }

    if (!['REPLENISHMENT', 'DISBURSEMENT'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "REPLENISHMENT" or "DISBURSEMENT"' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // If linking to a voucher, validate it exists and is APPROVED or POSTED
    if (referenceVoucherId) {
      const voucher = await prisma.expenseVoucher.findUnique({
        where: { id: referenceVoucherId },
      });
      if (!voucher) {
        return NextResponse.json(
          { error: `Expense voucher with id "${referenceVoucherId}" not found` },
          { status: 404 }
        );
      }
      if (!['APPROVED', 'POSTED'].includes(voucher.status)) {
        return NextResponse.json(
          { error: `Linked voucher must be APPROVED or POSTED (current status: "${voucher.status}")` },
          { status: 422 }
        );
      }
    }

    // Get current balance from last transaction
    const lastTransaction = await prisma.pettyCashTransaction.findFirst({
      orderBy: { transactedAt: 'desc' },
    });
    const currentBalance = lastTransaction ? lastTransaction.runningBalance : 0;

    // Calculate new running balance
    // REPLENISHMENT increases the balance, DISBURSEMENT decreases it
    const newBalance =
      type === 'REPLENISHMENT' ? currentBalance + amount : currentBalance - amount;

    if (type === 'DISBURSEMENT' && newBalance < 0) {
      return NextResponse.json(
        {
          error: `Insufficient petty cash balance. Current: ₱${currentBalance.toLocaleString()}, Requested: ₱${amount.toLocaleString()}`,
          currentBalance,
        },
        { status: 422 }
      );
    }

    const transaction = await prisma.pettyCashTransaction.create({
      data: {
        type,
        amount,
        description,
        runningBalance: newBalance,
        referenceVoucherId: referenceVoucherId || null,
      },
      include: {
        voucher: {
          select: { voucherNumber: true, payee: true, purpose: true },
        },
      },
    });

    return NextResponse.json(
      {
        ...transaction,
        previousBalance: currentBalance,
        currentBalance: newBalance,
        message: `Petty cash ${type.toLowerCase()} of ₱${amount.toLocaleString()} recorded. New balance: ₱${newBalance.toLocaleString()}.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Failed to record petty cash transaction:', error);
    return NextResponse.json({ error: 'Failed to record petty cash transaction' }, { status: 500 });
  }
}

export const GET = withAuditLog(getHandler, 'petty_cash_transactions');
export const POST = withAuditLog(postHandler, 'petty_cash_transactions');
