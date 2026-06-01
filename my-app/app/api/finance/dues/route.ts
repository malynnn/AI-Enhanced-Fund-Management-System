import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const duesRecords = await prisma.duesRecord.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Format to match UI expected fields
    const formattedRecords = duesRecords.map(record => ({
      id: record.id,
      transaction_id: record.transactionId,
      memberId: record.memberId,
      name: record.name,
      month: record.month,
      amountPaid: record.amountPaid,
      method: record.method,
      reference_number: record.referenceNumber,
      fund_to_credit: record.fundToCredit,
      status: record.status
    }));

    return NextResponse.json(formattedRecords);
  } catch (error) {
    console.error('Error fetching dues records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dues records' },
      { status: 500 }
    );
  }
}
