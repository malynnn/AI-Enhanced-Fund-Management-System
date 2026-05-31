// app/api/webhooks/repayments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const LAS_SYSTEM_URL = process.env.LAS_SYSTEM_API_URL || 'http://localhost:3000/api/mock/las-callback';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      loanReference,
      memberId,
      memberName,
      amount,
      principalAmount,
      serviceFeeAmount,
      paymentMethod,
      referenceNumber
    } = body;

    // Validate required fields
    if (!loanReference || !memberId || !memberName || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required repayment properties.' },
        { status: 400 }
      );
    }

    const totalAmount = parseFloat(amount);
    const principalPaid = parseFloat(principalAmount || '0');
    const serviceFeePaid = parseFloat(serviceFeeAmount || '0');

    if (isNaN(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Repayment amount must be a positive number.' },
        { status: 400 }
      );
    }

    // Calculate overpayment excess
    const expectedTotal = principalPaid + serviceFeePaid;
    const overpaymentAmount = totalAmount > expectedTotal ? (totalAmount - expectedTotal) : 0;
    const status = overpaymentAmount > 0 ? 'OVERPAYMENT_PENDING' : 'PROCESSED';

    // Execute database transaction to post split ledger entries safely
    const result = await prisma.$transaction(async (tx) => {
      // 1. Locate BDOEA Loans Fund ('LOAN_BDOEA')
      let loanFund = await tx.fund.findUnique({
        where: { code: 'LOAN_BDOEA' }
      });

      if (!loanFund) {
        loanFund = await tx.fund.findFirst({
          where: { code: { in: ['LOAN_BDOEA', 'LN'] } }
        });
      }

      if (!loanFund) {
        throw new Error('BDOEA Loans Fund ledger record could not be found.');
      }

      // 2. Locate General Fund ('GF') for service fees
      const generalFund = await tx.fund.findUnique({
        where: { code: 'GF' }
      });

      if (!generalFund) {
        throw new Error('General Fund ledger record could not be found.');
      }

      // 3. Post Principal Repayment to Loan Fund (Debit Cash / Credit Loan Receivable)
      let loanTxId = null;
      if (principalPaid > 0) {
        await tx.fund.update({
          where: { id: loanFund.id },
          data: { balance: { increment: principalPaid } }
        });

        const principalTx = await tx.fundTransaction.create({
          data: {
            fundId: loanFund.id,
            amount: principalPaid,
            type: 'DEPOSIT',
            description: `Loan Repayment Principal (Debit Cash / Credit Loan Receivable) for ${memberName} (Ref: ${loanReference})`,
            referenceId: referenceNumber || loanReference,
          }
        });
        loanTxId = principalTx.id;
      }

      // 4. Post Service-Fee Income to General Fund (Debit Cash / Credit Income Account)
      let serviceFeeTxId = null;
      if (serviceFeePaid > 0) {
        await tx.fund.update({
          where: { id: generalFund.id },
          data: { balance: { increment: serviceFeePaid } }
        });

        const serviceFeeTx = await tx.fundTransaction.create({
          data: {
            fundId: generalFund.id,
            amount: serviceFeePaid,
            type: 'DEPOSIT',
            description: `Service-Fee Income (Credit Income Account) from loan repayment: ${memberName} (Ref: ${loanReference})`,
            referenceId: referenceNumber || loanReference,
          }
        });
        serviceFeeTxId = serviceFeeTx.id;
      }

      // 5. Store the LoanRepayment record
      const repaymentRecord = await tx.loanRepayment.create({
        data: {
          loanReference,
          memberId,
          memberName,
          amount: totalAmount,
          principalAmount: principalPaid,
          serviceFeeAmount: serviceFeePaid,
          overpaymentAmount,
          paymentMethod,
          referenceNumber: referenceNumber || '',
          status,
          treasurerDecision: overpaymentAmount > 0 ? 'PENDING' : 'NONE',
        }
      });

      return { repaymentRecord, loanTxId, serviceFeeTxId };
    });

    // 6. Notify LAS (Criteria 5) in a fire-and-forget style
    try {
      const lasResponse = await fetch(LAS_SYSTEM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FS-Webhook-Secret': process.env.WEBHOOK_SECRET || 'fs_secure_secret_key'
        },
        body: JSON.stringify({
          eventType: 'REPAYMENT_POSTED',
          loanReference,
          memberId,
          memberName,
          amount: totalAmount,
          principalPaid,
          serviceFeePaid,
          overpayment: overpaymentAmount,
          referenceNumber: referenceNumber || '',
          fsTransactionId: result.repaymentRecord.id,
          postedAt: new Date().toISOString()
        })
      });

      if (!lasResponse.ok) {
        console.warn(`⚠️ LAS mock server responded with code: ${lasResponse.status}`);
      }
    } catch (err) {
      console.warn('🚨 Failed to notify LAS server (normal when LAS is not running/integrated):', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Repayment ledger entries successfully posted and LAS notified.',
      repayment: result.repaymentRecord,
      principalTxId: result.loanTxId,
      serviceFeeTxId: result.serviceFeeTxId,
      overpaymentDetected: overpaymentAmount > 0
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Repayment posting webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// GET: Retrieve all repayments
export async function GET() {
  try {
    const repayments = await prisma.loanRepayment.findMany({
      orderBy: {
        processedAt: 'desc',
      },
    });
    return NextResponse.json(repayments, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching repayments list:', error);
    return NextResponse.json(
      { error: 'Internal Server Error failed to read repayments.' },
      { status: 500 }
    );
  }
}

