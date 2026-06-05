import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// PUT - update account name, type, fund (not code)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, fund, status } = body;

    const account = await prisma.chartOfAccount.update({
      where: { id },
      data: { name, type, fund, status },
    });

    return NextResponse.json(account);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    console.error('Error updating account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

// PATCH - toggle status (Active <-> Inactive)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const account = await prisma.chartOfAccount.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(account);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    console.error('Error toggling account status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
