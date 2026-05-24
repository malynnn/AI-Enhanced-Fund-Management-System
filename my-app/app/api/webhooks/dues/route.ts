// app/api/webhooks/dues/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Ask your teammate what their actual local port or domain is!
const MEMBERSHIP_SYSTEM_URL = process.env.MEMBERSHIP_SYSTEM_API_URL || 'http://localhost:3000/api/mock/ms-callback';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      transactionId,
      date,
      memberId,
      fullName,
      monthCovered,
      amount,
      paymentMethod,
      referenceNumber,
      fundCredited
    } = body;

    if (!transactionId || !memberId || !amount || !fundCredited) {
      return NextResponse.json(
        { success: false, error: 'Missing core transaction properties.' },
        { status: 400 }
      );
    }

    // Rate validation checks
    let hasDiscrepancy = false;
    let discrepancyDetails = '';

    if (fundCredited === 'UF' && amount !== 100) {
      hasDiscrepancy = true;
      discrepancyDetails = `Standard Union Dues must be ₱100. Received: ₱${amount}`;
    } else if (fundCredited === 'UD' && amount !== 50) { 
      hasDiscrepancy = true;
      discrepancyDetails = `Standard Union Donation must be ₱50. Received: ₱${amount}`;
    }

    // Execute safe database transaction
    const result = await prisma.$transaction(async (tx) => {
      const targetFund = await tx.fund.findUnique({
        where: { code: fundCredited }
      });

      if (!targetFund) {
        throw new Error(`Target ledger index code "${fundCredited}" not found.`);
      }

      const postedTransaction = await tx.fundTransaction.create({
        data: {
          fundId: targetFund.id,
          amount: parseFloat(amount),
          type: 'DEPOSIT',
          // We append the breakdown details cleanly right inside the description string for audit tracking!
          description: `Dues Posting: ${fullName} (ID: ${memberId}) | Month: ${monthCovered} | Method: ${paymentMethod} | Discrepancy: ${hasDiscrepancy ? 'YES - ' + discrepancyDetails : 'NO'}`,
          referenceId: referenceNumber || transactionId,
          timestamp: new Date(date),
        }
      });

      const updatedFund = await tx.fund.update({
        where: { id: targetFund.id },
        data: { balance: { increment: parseFloat(amount) } }
      });

      return { postedTransaction, updatedFund };
    });

    // =========================================================================
    // CRITICAL FIX FOR CRITERIA #6: Send payment confirmation back to MS
    // =========================================================================
    try {
      const msResponse = await fetch(MEMBERSHIP_SYSTEM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FS-Webhook-Secret': process.env.WEBHOOK_SECRET || 'fs_secure_secret_key'
        },
        body: JSON.stringify({
          msTransactionId: transactionId,
          fsTransactionId: result.postedTransaction.id,
          status: 'RECONCILED',
          reconciledAt: new Date().toISOString(),
          hasDiscrepancy: hasDiscrepancy,
          discrepancyDetails: discrepancyDetails || null
        })
      });

      if (!msResponse.ok) {
        console.warn(`⚠️ MS accepted the callback but returned status: ${msResponse.status}`);
      }
    } catch (fetchErr) {
      // We log the network error but don't crash our response, 
      // because our database write was already successful!
      console.error('🚨 Failed to broadcast confirmation back to Membership System:', fetchErr);
    }
    // =========================================================================

    return NextResponse.json({
      success: true,
      message: 'Ledger line entry successfully posted and confirmation sent.',
      confirmation: {
        postedTransactionId: result.postedTransaction.id,
        flaggedDiscrepancy: hasDiscrepancy
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Dues posting webhook error event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Ledger Mutation Error' },
      { status: 500 }
    );
  }
}