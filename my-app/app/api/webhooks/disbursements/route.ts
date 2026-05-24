// app/api/webhooks/disbursements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      loanReference,
      memberId,
      memberName,
      amount,
      paymentMethod,
      bankAccount,
      paymentDetails
    } = body;

    // Validate required fields
    if (!loanReference || !memberId || !memberName || !amount || !paymentMethod || !bankAccount) {
      return NextResponse.json(
        { success: false, error: 'Missing required disbursement properties.' },
        { status: 400 }
      );
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Disbursement amount must be a positive number.' },
        { status: 400 }
      );
    }

    // Run transaction to auto-debit BDOEA Loans Fund and post pending disbursement request
    const result = await prisma.$transaction(async (tx) => {
      // 1. Locate BDOEA Loans Fund ('LOAN_BDOEA')
      let targetFund = await tx.fund.findUnique({
        where: { code: 'LOAN_BDOEA' }
      });

      // Fallback in case seeds were run differently or general Loans code ('LN') was used
      if (!targetFund) {
        targetFund = await tx.fund.findFirst({
          where: { code: { in: ['LOAN_BDOEA', 'LN'] } }
        });
      }

      if (!targetFund) {
        throw new Error('BDOEA Loans Fund ledger record could not be found.');
      }

      // 2. Auto-debit BDOEA Loans Fund balance
      const updatedFund = await tx.fund.update({
        where: { id: targetFund.id },
        data: { balance: { decrement: numericAmount } }
      });

      // 3. Create FundTransaction ledger entry
      const postedTransaction = await tx.fundTransaction.create({
        data: {
          fundId: targetFund.id,
          amount: -numericAmount, // Negative for withdrawal/debit
          type: 'LOAN_DISBURSEMENT',
          description: `Auto-Debit: Approved Loan disbursement for ${memberName} (Ref: ${loanReference})`,
          referenceId: loanReference,
        }
      });

      // 4. Record the pending disbursement request separately (Task 2 & 4)
      const disbursementRequest = await tx.disbursementRequest.create({
        data: {
          loanReference,
          memberId,
          memberName,
          amount: numericAmount,
          paymentMethod,
          bankAccount,
          paymentDetails: paymentDetails || '',
          status: 'PENDING',
          fundId: targetFund.id,
        }
      });

      return { updatedFund, postedTransaction, disbursementRequest };
    });

    return NextResponse.json({
      success: true,
      message: 'Disbursement request received, fund debited, and request queued.',
      disbursement: result.disbursementRequest,
      transactionId: result.postedTransaction.id,
      newBalance: result.updatedFund.balance
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error handling disbursement webhook:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
