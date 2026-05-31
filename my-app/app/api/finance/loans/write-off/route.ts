// app/api/finance/loans/write-off/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const LAS_SYSTEM_URL = process.env.LAS_SYSTEM_API_URL || 'http://localhost:3000/api/mock/las-callback';

// GET: List all write-offs
export async function GET() {
  try {
    const writeOffs = await prisma.loanWriteOff.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(writeOffs, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching write-offs:', error);
    return NextResponse.json(
      { error: 'Internal Server Error failed to read write-offs.' },
      { status: 500 }
    );
  }
}

// POST: Request a write-off
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { loanReference, memberId, memberName, amount, reason, requestedBy } = body;

    if (!loanReference || !memberId || !memberName || !amount || !reason || !requestedBy) {
      return NextResponse.json(
        { error: 'Missing required write-off properties.' },
        { status: 400 }
      );
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: 'Write-off amount must be a positive number.' },
        { status: 400 }
      );
    }

    const writeOff = await prisma.loanWriteOff.create({
      data: {
        loanReference,
        memberId,
        memberName,
        amount: numericAmount,
        reason,
        requestedBy,
        status: 'PENDING',
      },
    });

    return NextResponse.json(writeOff, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating write-off request:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT: Approve or reject write-off (Approval workflow & Accounting entries)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, authorizedBy } = body;

    if (!id || !status || !authorizedBy) {
      return NextResponse.json(
        { error: 'Missing required parameters (id, status, authorizedBy).' },
        { status: 400 }
      );
    }

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED or REJECTED.' },
        { status: 400 }
      );
    }

    // Retrieve the write-off request
    const existingRequest = await prisma.loanWriteOff.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Write-off request not found.' },
        { status: 404 }
      );
    }

    if (existingRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This request has already been processed.' },
        { status: 400 }
      );
    }

    const amount = existingRequest.amount;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the request status
      const updatedRequest = await tx.loanWriteOff.update({
        where: { id },
        data: {
          status,
          authorizedBy,
        },
      });

      let transactionId = null;

      // 2. If approved, apply the accounting treatment (debit allowance/expense, credit loan receivable = reduce Loans Fund balance)
      if (status === 'APPROVED') {
        // Locate BDOEA Loans Fund
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

        // Decrement the Loans Fund balance
        await tx.fund.update({
          where: { id: loanFund.id },
          data: { balance: { decrement: amount } }
        });

        // Create a negative FundTransaction (withdrawal/debit asset reduction)
        const writeOffTx = await tx.fundTransaction.create({
          data: {
            fundId: loanFund.id,
            amount: -amount, // Negative to represent writing off / decrement
            type: 'LOAN_DISBURSEMENT', // Under standard ledger categorization
            description: `Loan Write-off (Credit Loan Receivable / Asset reduction) for ${existingRequest.memberName} (Ref: ${existingRequest.loanReference}). Authorized by ${authorizedBy}. Reason: ${existingRequest.reason}`,
            referenceId: existingRequest.loanReference,
          }
        });
        transactionId = writeOffTx.id;
      }

      return { updatedRequest, transactionId };
    });

    // 3. Notify LAS if approved
    if (status === 'APPROVED') {
      try {
        await fetch(LAS_SYSTEM_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-FS-Webhook-Secret': process.env.WEBHOOK_SECRET || 'fs_secure_secret_key'
          },
          body: JSON.stringify({
            eventType: 'LOAN_WRITE_OFF_POSTED',
            loanReference: existingRequest.loanReference,
            memberId: existingRequest.memberId,
            memberName: existingRequest.memberName,
            amount,
            status: 'WRITTEN_OFF',
            fsTransactionId: result.transactionId,
            authorizedBy,
            postedAt: new Date().toISOString()
          })
        });
      } catch (err) {
        console.warn('🚨 Failed to notify LAS server about write-off approval:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Write-off request has been successfully ${status.toLowerCase()}.`,
      request: result.updatedRequest,
      transactionId: result.transactionId
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error processing write-off approval:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
