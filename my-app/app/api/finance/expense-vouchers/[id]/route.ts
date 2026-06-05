// app/api/finance/expense-vouchers/[id]/route.ts
// FS-006 AC1: Single voucher CRUD
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditLog } from '@/lib/withAuditLog';

// GET /api/finance/expense-vouchers/:id
async function getHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const voucher = await prisma.expenseVoucher.findUnique({
      where: { id },
      include: {
        pettyCashTransactions: { orderBy: { transactedAt: 'desc' } },
      },
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Expense voucher not found' }, { status: 404 });
    }

    return NextResponse.json(voucher, { status: 200 });
  } catch (error) {
    console.error('❌ Failed to fetch expense voucher:', error);
    return NextResponse.json({ error: 'Failed to fetch expense voucher' }, { status: 500 });
  }
}

// PUT /api/finance/expense-vouchers/:id
// Only PENDING vouchers can be edited
async function putHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { date, payee, purpose, amount, accountCode, approvedBy, notes } = body;

    const existing = await prisma.expenseVoucher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Expense voucher not found' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot edit a voucher with status "${existing.status}". Only PENDING vouchers can be modified.` },
        { status: 409 }
      );
    }

    // Validate accountCode if being updated
    if (accountCode && accountCode !== existing.accountCode) {
      const account = await prisma.chartOfAccount.findUnique({ where: { code: accountCode } });
      if (!account) {
        return NextResponse.json(
          { error: `Account code "${accountCode}" does not exist in Chart of Accounts` },
          { status: 422 }
        );
      }
    }

    const updated = await prisma.expenseVoucher.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(payee && { payee }),
        ...(purpose && { purpose }),
        ...(amount !== undefined && { amount }),
        ...(accountCode && { accountCode }),
        ...(approvedBy !== undefined && { approvedBy }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('❌ Failed to update expense voucher:', error);
    return NextResponse.json({ error: 'Failed to update expense voucher' }, { status: 500 });
  }
}

// DELETE /api/finance/expense-vouchers/:id
// Only PENDING vouchers can be deleted
async function deleteHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const existing = await prisma.expenseVoucher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Expense voucher not found' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot delete a voucher with status "${existing.status}". Only PENDING vouchers can be deleted.` },
        { status: 409 }
      );
    }

    await prisma.expenseVoucher.delete({ where: { id } });

    return NextResponse.json({ message: 'Expense voucher deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('❌ Failed to delete expense voucher:', error);
    return NextResponse.json({ error: 'Failed to delete expense voucher' }, { status: 500 });
  }
}

export const GET = withAuditLog(getHandler, 'expense_vouchers');
export const PUT = withAuditLog(putHandler, 'expense_vouchers');
export const DELETE = withAuditLog(deleteHandler, 'expense_vouchers');
