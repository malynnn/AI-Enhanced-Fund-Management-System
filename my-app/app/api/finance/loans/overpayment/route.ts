// app/api/finance/loans/overpayment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const LAS_SYSTEM_URL = process.env.LAS_SYSTEM_API_URL || 'http://localhost:3000/api/mock/las-callback';

// GET: Fetch all repayments with overpayment records
export async function GET() {
  try {
    const repayments = await prisma.loanRepayment.findMany({
      where: {
        overpaymentAmount: {
          gt: 0,
        },
      },
      orderBy: {
        processedAt: 'desc',
      },
    });
    return NextResponse.json(repayments, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching overpayments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error failed to read overpayments.' },
      { status: 500 }
    );
  }
}

// PUT: Process Treasurer's Decision for Overpayment
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { repaymentId, decision, authorizedBy } = body;

    if (!repaymentId || !decision || !authorizedBy) {
      return NextResponse.json(
        { error: 'Missing required parameters (repaymentId, decision, authorizedBy).' },
        { status: 400 }
      );
    }

    if (decision !== 'ADVANCE_CREDIT' && decision !== 'REFUND') {
      return NextResponse.json(
        { error: 'Invalid decision. Must be ADVANCE_CREDIT or REFUND.' },
        { status: 400 }
      );
    }

    // Retrieve the repayment record
    const repayment = await prisma.loanRepayment.findUnique({
      where: { id: repaymentId },
    });

    if (!repayment) {
      return NextResponse.json(
        { error: 'Repayment record not found.' },
        { status: 404 }
      );
    }

    if (repayment.status !== 'OVERPAYMENT_PENDING') {
      return NextResponse.json(
        { error: 'This overpayment has already been processed or contains no overpayment.' },
        { status: 400 }
      );
    }

    const excessAmount = repayment.overpaymentAmount;
    const finalStatus = decision === 'ADVANCE_CREDIT' ? 'OVERPAYMENT_CREDITED' : 'OVERPAYMENT_REFUNDED';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update LoanRepayment record status and decision
      const updatedRepayment = await tx.loanRepayment.update({
        where: { id: repaymentId },
        data: {
          status: finalStatus,
          treasurerDecision: decision,
        },
      });

      let ledgerTxId = null;

      // 2. Apply proper ledger accounting entries based on Treasurer decision
      if (decision === 'ADVANCE_CREDIT') {
        // Increment the BDOEA Loans Fund (apply excess as advance payment)
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

        await tx.fund.update({
          where: { id: loanFund.id },
          data: { balance: { increment: excessAmount } }
        });

        // Post a DEPOSIT ledger entry
        const advanceTx = await tx.fundTransaction.create({
          data: {
            fundId: loanFund.id,
            amount: excessAmount,
            type: 'DEPOSIT',
            description: `Loan Repayment Overpayment: Posted as Advance Payment Credit for ${repayment.memberName} (Ref: ${repayment.loanReference}). Authorized by Treasurer ${authorizedBy}`,
            referenceId: repayment.referenceNumber || repayment.loanReference,
          }
        });
        ledgerTxId = advanceTx.id;

      } else if (decision === 'REFUND') {
        const generalFund = await tx.fund.findFirst({
          where: { code: 'GF' }
        });

        if (!generalFund) {
          throw new Error('General Fund ledger record could not be found to draw refund cash.');
        }

        await tx.fund.update({
          where: { id: generalFund.id },
          data: { balance: { decrement: excessAmount } }
        });

        const refundTx = await tx.fundTransaction.create({
          data: {
            fundId: generalFund.id,
            amount: -excessAmount,
            type: 'WITHDRAWAL',
            description: `Cash Refund: Returned Loan Overpayment to ${repayment.memberName} (Ref: ${repayment.loanReference}). Authorized by Treasurer ${authorizedBy}`,
            referenceId: repayment.referenceNumber || repayment.loanReference,
          }
        });
        ledgerTxId = refundTx.id;
      }

      return { updatedRepayment, ledgerTxId };
    });

    // 3. Notify LAS of the overpayment resolution decision
    try {
      await fetch(LAS_SYSTEM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FS-Webhook-Secret': process.env.WEBHOOK_SECRET || 'fs_secure_secret_key'
        },
        body: JSON.stringify({
          eventType: 'REPAYMENT_OVERPAYMENT_RESOLVED',
          loanReference: repayment.loanReference,
          memberId: repayment.memberId,
          memberName: repayment.memberName,
          overpaymentAmount: excessAmount,
          resolutionDecision: decision,
          status: finalStatus,
          fsTransactionId: result.ledgerTxId,
          authorizedBy,
          resolvedAt: new Date().toISOString()
        })
      });
    } catch (err) {
      console.warn('🚨 Failed to notify LAS server about overpayment resolution:', err);
    }

    return NextResponse.json({
      success: true,
      message: `Overpayment successfully resolved as ${decision === 'ADVANCE_CREDIT' ? 'Advance Credit' : 'Refund'}.`,
      repayment: result.updatedRepayment,
      transactionId: result.ledgerTxId
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error updating overpayment decision:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
