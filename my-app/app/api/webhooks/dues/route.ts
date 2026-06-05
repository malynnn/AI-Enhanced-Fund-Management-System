// app/api/webhooks/dues/route.ts
// This route ONLY receives the incoming MS webhook and saves the record as PENDING.
// The Treasurer must then click "Post & Notify" to actually post it to the ledger.
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

    // Check for duplicate transaction
    const existing = await prisma.duesRecord.findUnique({
      where: { transactionId }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Transaction ID ${transactionId} already exists.` },
        { status: 409 }
      );
    }

    // Validate the fund code exists
    const targetFund = await prisma.fund.findUnique({
      where: { code: fundCredited }
    });

    if (!targetFund) {
      return NextResponse.json(
        { success: false, error: `Fund code "${fundCredited}" not found in ledger.` },
        { status: 400 }
      );
    }

    // Save as PENDING — Treasurer must review and confirm via "Post & Notify"
    const duesRecord = await prisma.duesRecord.create({
      data: {
        transactionId,
        memberId,
        name: fullName.toUpperCase(),
        month: monthCovered,
        amountPaid: parseFloat(amount),
        method: paymentMethod,
        referenceNumber: referenceNumber || null,
        fundToCredit: fundCredited,
        status: 'Pending'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Dues record received and queued for Treasurer review.',
      record: {
        id: duesRecord.id,
        transactionId: duesRecord.transactionId,
        status: duesRecord.status
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Dues webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}