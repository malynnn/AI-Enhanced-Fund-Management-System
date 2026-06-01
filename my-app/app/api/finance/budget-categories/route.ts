// app/api/finance/budget-categories/route.ts
// FS-006 AC5: Budget ceiling management for expense categories
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditLog } from '@/lib/withAuditLog';

export const dynamic = 'force-dynamic';

// GET /api/finance/budget-categories
// Returns all budget ceilings with current spend data
async function getHandler(req: NextRequest) {
  try {
    const categories = await prisma.budgetCategory.findMany({
      orderBy: { accountCode: 'asc' },
    });

    // Enrich each category with actual spend (sum of POSTED vouchers)
    const enriched = await Promise.all(
      categories.map(async (cat) => {
        const postedVouchers = await prisma.expenseVoucher.findMany({
          where: { accountCode: cat.accountCode, status: 'POSTED' },
        });
        const totalSpent = postedVouchers.reduce((sum, v) => sum + v.amount, 0);
        const remaining = cat.approvedAmount - totalSpent;

        return {
          ...cat,
          totalSpent,
          remainingBudget: remaining,
          utilizationPercent: cat.approvedAmount > 0
            ? parseFloat(((totalSpent / cat.approvedAmount) * 100).toFixed(2))
            : 0,
          isExceeded: totalSpent > cat.approvedAmount,
        };
      })
    );

    return NextResponse.json(enriched, { status: 200 });
  } catch (error) {
    console.error('❌ Failed to fetch budget categories:', error);
    return NextResponse.json({ error: 'Failed to fetch budget categories' }, { status: 500 });
  }
}

// POST /api/finance/budget-categories
// Body: { accountCode, accountName, approvedAmount, fiscalYear }
async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountCode, accountName, approvedAmount, fiscalYear } = body;

    if (!accountCode || !accountName || approvedAmount === undefined || !fiscalYear) {
      return NextResponse.json(
        { error: 'Missing required fields: accountCode, accountName, approvedAmount, fiscalYear' },
        { status: 400 }
      );
    }

    if (typeof approvedAmount !== 'number' || approvedAmount < 0) {
      return NextResponse.json({ error: 'approvedAmount must be a non-negative number' }, { status: 400 });
    }

    // Validate accountCode exists in Chart of Accounts
    const account = await prisma.chartOfAccount.findUnique({ where: { code: accountCode } });
    if (!account) {
      return NextResponse.json(
        { error: `Account code "${accountCode}" does not exist in Chart of Accounts` },
        { status: 422 }
      );
    }

    const category = await prisma.budgetCategory.create({
      data: { accountCode, accountName, approvedAmount, fiscalYear },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A budget category for this account code already exists. Use PUT to update.' },
        { status: 409 }
      );
    }
    console.error('❌ Failed to create budget category:', error);
    return NextResponse.json({ error: 'Failed to create budget category' }, { status: 500 });
  }
}

export const GET = withAuditLog(getHandler, 'budget_categories');
export const POST = withAuditLog(postHandler, 'budget_categories');
