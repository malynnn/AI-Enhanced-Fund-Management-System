// app/api/finance/expense-vouchers/route.ts
// FS-006 AC1: Expense Voucher CRUD API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditLog } from '@/lib/withAuditLog';

export const dynamic = 'force-dynamic';

// GET /api/finance/expense-vouchers
// Optional query: ?status=PENDING|APPROVED|REJECTED|POSTED
async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    const vouchers = await prisma.expenseVoucher.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(vouchers, { status: 200 });
  } catch (error) {
    console.error('❌ Failed to fetch expense vouchers:', error);
    return NextResponse.json({ error: 'Failed to fetch expense vouchers' }, { status: 500 });
  }
}

// POST /api/finance/expense-vouchers
// AC1: Fields — voucherNumber, date, payee, purpose, amount, accountCode, approvedBy, notes
// AC2: Voucher starts as PENDING — must be approved before it can be posted
async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const { voucherNumber, date, payee, purpose, amount, accountCode, approvedBy, notes } = body;

    // Required field validation
    if (!voucherNumber || !date || !payee || !purpose || !amount || !accountCode) {
      return NextResponse.json(
        { error: 'Missing required fields: voucherNumber, date, payee, purpose, amount, accountCode' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Verify the accountCode exists in Chart of Accounts
    const account = await prisma.chartOfAccount.findUnique({ where: { code: accountCode } });
    if (!account) {
      return NextResponse.json(
        { error: `Account code "${accountCode}" does not exist in Chart of Accounts` },
        { status: 422 }
      );
    }

    const voucher = await prisma.expenseVoucher.create({
      data: {
        voucherNumber,
        date: new Date(date),
        payee,
        purpose,
        amount,
        accountCode,
        approvedBy: approvedBy || null,
        notes: notes || null,
        status: 'PENDING', // AC2: always starts as PENDING
      },
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Voucher number already exists' }, { status: 409 });
    }
    console.error('❌ Failed to create expense voucher:', error);
    return NextResponse.json({ error: 'Failed to create expense voucher' }, { status: 500 });
  }
}

export const GET = withAuditLog(getHandler, 'expense_vouchers');
export const POST = withAuditLog(postHandler, 'expense_vouchers');
