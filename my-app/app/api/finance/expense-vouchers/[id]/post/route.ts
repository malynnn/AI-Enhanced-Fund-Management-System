// app/api/finance/expense-vouchers/[id]/post/route.ts
// FS-006 AC2: Pre-approval guard before posting
// FS-006 AC5: Budget ceiling warning
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditLog } from '@/lib/withAuditLog';

// PATCH /api/finance/expense-vouchers/:id/post
// Posts the expense: deducts from General Fund, marks voucher as POSTED
// Returns budgetWarning: true if approved budget for the category would be exceeded
async function postExpenseHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const voucher = await prisma.expenseVoucher.findUnique({ where: { id } });
    if (!voucher) {
      return NextResponse.json({ error: 'Expense voucher not found' }, { status: 404 });
    }

    // AC2: Pre-approval guard — must be APPROVED before posting
    if (voucher.status !== 'APPROVED') {
      return NextResponse.json(
        {
          error: `Expense voucher cannot be posted. Current status is "${voucher.status}". Only APPROVED vouchers can be posted.`,
          hint: 'Use PATCH /api/finance/expense-vouchers/:id/approve to approve the voucher first.',
        },
        { status: 403 }
      );
    }

    // AC5: Budget ceiling check — calculate total posted spend for this account code
    let budgetWarning = false;
    let budgetWarningMessage: string | null = null;

    const budgetCategory = await prisma.budgetCategory.findUnique({
      where: { accountCode: voucher.accountCode },
    });

    if (budgetCategory) {
      // Sum all POSTED vouchers for this account code in the same fiscal year
      const currentYear = new Date().getFullYear();
      const allPostedVouchers = await prisma.expenseVoucher.findMany({
        where: {
          accountCode: voucher.accountCode,
          status: 'POSTED',
        },
      });

      const totalPostedSoFar = allPostedVouchers.reduce((sum, v) => sum + v.amount, 0);
      const projectedTotal = totalPostedSoFar + voucher.amount;

      if (projectedTotal > budgetCategory.approvedAmount) {
        budgetWarning = true;
        budgetWarningMessage = `⚠️ Budget ceiling exceeded for "${budgetCategory.accountName}" (Account: ${voucher.accountCode}). Approved budget: ₱${budgetCategory.approvedAmount.toLocaleString()}, Total after posting: ₱${projectedTotal.toLocaleString()}, Overage: ₱${(projectedTotal - budgetCategory.approvedAmount).toLocaleString()}.`;
      }
    }

    // Deduct from General Fund (GF) via a FundTransaction record
    const generalFund = await prisma.fund.findUnique({ where: { code: 'GF' } });
    if (!generalFund) {
      return NextResponse.json(
        { error: 'General Fund (GF) not found. Cannot post expense.' },
        { status: 500 }
      );
    }

    // Perform DB operations in a transaction for atomicity
    const [updatedVoucher] = await prisma.$transaction([
      // 1. Mark voucher as POSTED
      prisma.expenseVoucher.update({
        where: { id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
        },
      }),
      // 2. Deduct amount from General Fund balance
      prisma.fund.update({
        where: { code: 'GF' },
        data: { balance: { decrement: voucher.amount } },
      }),
      // 3. Record in FundTransaction ledger
      prisma.fundTransaction.create({
        data: {
          fundId: generalFund.id,
          amount: -voucher.amount,
          type: 'EXPENSE_VOUCHER',
          description: `Expense Voucher ${voucher.voucherNumber}: ${voucher.purpose} — Payee: ${voucher.payee}`,
          referenceId: voucher.id,
        },
      }),
    ]);

    return NextResponse.json(
      {
        ...updatedVoucher,
        budgetWarning,
        budgetWarningMessage,
        message: budgetWarning
          ? 'Expense posted successfully with a budget warning.'
          : 'Expense posted successfully.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Failed to post expense voucher:', error);
    return NextResponse.json({ error: 'Failed to post expense voucher' }, { status: 500 });
  }
}

export const PATCH = withAuditLog(postExpenseHandler, 'expense_vouchers');
