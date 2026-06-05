// app/api/finance/expense-vouchers/[id]/approve/route.ts
// FS-006 AC2: Pre-approval gate — only APPROVED vouchers can be posted
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditLog } from '@/lib/withAuditLog';

// PATCH /api/finance/expense-vouchers/:id/approve
// Body: { approvedBy: string, decision: "APPROVED" | "REJECTED", notes?: string }
async function approveHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { approvedBy, decision, notes } = body;

    if (!approvedBy || !decision) {
      return NextResponse.json(
        { error: 'Missing required fields: approvedBy, decision (APPROVED | REJECTED)' },
        { status: 400 }
      );
    }

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decision must be either "APPROVED" or "REJECTED"' },
        { status: 400 }
      );
    }

    const existing = await prisma.expenseVoucher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Expense voucher not found' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Voucher is already "${existing.status}" and cannot be re-approved.` },
        { status: 409 }
      );
    }

    const updated = await prisma.expenseVoucher.update({
      where: { id },
      data: {
        status: decision,
        approvedBy,
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(
      {
        ...updated,
        message: `Expense voucher ${decision.toLowerCase()} successfully.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Failed to approve expense voucher:', error);
    return NextResponse.json({ error: 'Failed to approve expense voucher' }, { status: 500 });
  }
}

export const PATCH = withAuditLog(approveHandler, 'expense_vouchers');
