// app/api/finance/budget-categories/[id]/route.ts
// FS-006 AC5: Individual budget category CRUD
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditLog } from '@/lib/withAuditLog';

// GET /api/finance/budget-categories/:id
async function getHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const category = await prisma.budgetCategory.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: 'Budget category not found' }, { status: 404 });
    }

    // Enrich with spend data
    const postedVouchers = await prisma.expenseVoucher.findMany({
      where: { accountCode: category.accountCode, status: 'POSTED' },
    });
    const totalSpent = postedVouchers.reduce((sum, v) => sum + v.amount, 0);

    return NextResponse.json(
      {
        ...category,
        totalSpent,
        remainingBudget: category.approvedAmount - totalSpent,
        utilizationPercent: category.approvedAmount > 0
          ? parseFloat(((totalSpent / category.approvedAmount) * 100).toFixed(2))
          : 0,
        isExceeded: totalSpent > category.approvedAmount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Failed to fetch budget category:', error);
    return NextResponse.json({ error: 'Failed to fetch budget category' }, { status: 500 });
  }
}

// PUT /api/finance/budget-categories/:id
async function putHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { accountName, approvedAmount, fiscalYear } = body;

    const existing = await prisma.budgetCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Budget category not found' }, { status: 404 });
    }

    if (approvedAmount !== undefined && (typeof approvedAmount !== 'number' || approvedAmount < 0)) {
      return NextResponse.json({ error: 'approvedAmount must be a non-negative number' }, { status: 400 });
    }

    const updated = await prisma.budgetCategory.update({
      where: { id },
      data: {
        ...(accountName && { accountName }),
        ...(approvedAmount !== undefined && { approvedAmount }),
        ...(fiscalYear && { fiscalYear }),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('❌ Failed to update budget category:', error);
    return NextResponse.json({ error: 'Failed to update budget category' }, { status: 500 });
  }
}

// DELETE /api/finance/budget-categories/:id
async function deleteHandler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const existing = await prisma.budgetCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Budget category not found' }, { status: 404 });
    }

    await prisma.budgetCategory.delete({ where: { id } });

    return NextResponse.json({ message: 'Budget category deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('❌ Failed to delete budget category:', error);
    return NextResponse.json({ error: 'Failed to delete budget category' }, { status: 500 });
  }
}

export const GET = withAuditLog(getHandler, 'budget_categories');
export const PUT = withAuditLog(putHandler, 'budget_categories');
export const DELETE = withAuditLog(deleteHandler, 'budget_categories');
