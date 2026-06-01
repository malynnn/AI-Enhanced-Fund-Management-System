// app/api/finance/dues/[id]/confirm/route.ts
// Called when the Treasurer clicks "Post & Notify" on a pending dues record.
// This posts the actual ledger entry, updates the record to Confirmed,
// and sends a payment confirmation callback back to the Membership System.
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const MEMBERSHIP_SYSTEM_URL = process.env.MEMBERSHIP_SYSTEM_API_URL || 'http://localhost:3000/api/mock/ms-callback';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Find the pending dues record
    const duesRecord = await prisma.duesRecord.findUnique({ where: { id } });

    if (!duesRecord) {
      return NextResponse.json({ error: 'Dues record not found.' }, { status: 404 });
    }

    if (duesRecord.status === 'Confirmed') {
      return NextResponse.json({ error: 'This record has already been posted to the ledger.' }, { status: 400 });
    }

    // 2. Find the target fund
    const targetFund = await prisma.fund.findUnique({
      where: { code: duesRecord.fundToCredit }
    });

    if (!targetFund) {
      return NextResponse.json(
        { error: `Fund code "${duesRecord.fundToCredit}" not found in ledger.` },
        { status: 400 }
      );
    }

    // 3. Discrepancy check (₱500 standard dues)
    const standardDuesAmount = 500;
    const hasDiscrepancy = duesRecord.amountPaid !== standardDuesAmount;
    const discrepancyDetails = hasDiscrepancy
      ? `Standard dues is ₱${standardDuesAmount}. Received: ₱${duesRecord.amountPaid}`
      : '';

    // 4. Post to ledger + update record status in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Post the fund transaction (actual ledger entry)
      const fundTransaction = await tx.fundTransaction.create({
        data: {
          fundId: targetFund.id,
          amount: duesRecord.amountPaid,
          type: 'DEPOSIT',
          description: `Dues Posting: ${duesRecord.name} (ID: ${duesRecord.memberId}) | Month: ${duesRecord.month} | Method: ${duesRecord.method} | Discrepancy: ${hasDiscrepancy ? 'YES - ' + discrepancyDetails : 'NO'}`,
          referenceId: duesRecord.referenceNumber || duesRecord.transactionId,
        }
      });

      // Update fund balance
      await tx.fund.update({
        where: { id: targetFund.id },
        data: { balance: { increment: duesRecord.amountPaid } }
      });

      // Mark dues record as Confirmed
      const updated = await tx.duesRecord.update({
        where: { id },
        data: { status: 'Confirmed' }
      });

      return { fundTransaction, updated };
    });

    // 5. Send confirmation callback back to Membership System (AC #6)
    let callbackSuccess = false;
    try {
      const msResponse = await fetch(MEMBERSHIP_SYSTEM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FS-Webhook-Secret': process.env.WEBHOOK_SECRET || 'fs_secure_secret_key'
        },
        body: JSON.stringify({
          msTransactionId: duesRecord.transactionId,
          fsLedgerEntryId: result.fundTransaction.id,
          memberId: duesRecord.memberId,
          memberName: duesRecord.name,
          month: duesRecord.month,
          amountPosted: duesRecord.amountPaid,
          fundCredited: targetFund.name,
          status: 'POSTED_TO_LEDGER',
          hasDiscrepancy,
          discrepancyDetails: discrepancyDetails || null,
          confirmedAt: new Date().toISOString()
        })
      });
      callbackSuccess = msResponse.ok;
    } catch (err) {
      console.warn('⚠️ Could not reach MS callback URL (non-fatal):', err);
    }

    return NextResponse.json({
      success: true,
      message: `Dues for ${duesRecord.name} (${duesRecord.month}) posted to ledger. MS ${callbackSuccess ? 'notified' : 'notification pending'}.`,
      hasDiscrepancy,
      ledgerEntryId: result.fundTransaction.id
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error confirming dues record:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
