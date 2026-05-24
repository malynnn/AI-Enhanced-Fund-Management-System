// app/api/finance/disbursements/[id]/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const LAS_SYSTEM_URL = process.env.LAS_SYSTEM_API_URL || 'http://localhost:3000/api/mock/las-callback';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { authorizedBy } = body;

    const officerSignature = authorizedBy || 'Treasurer Romalyn Amante';

    // 1. Verify disbursement request exists and is pending
    const disbursement = await prisma.disbursementRequest.findUnique({
      where: { id }
    });

    if (!disbursement) {
      return NextResponse.json(
        { success: false, error: 'Disbursement request not found.' },
        { status: 404 }
      );
    }

    if (disbursement.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Disbursement request has already been confirmed.' },
        { status: 400 }
      );
    }

    // 2. Update status and save signature authorizedBy (Task 2 & 3)
    const updatedDisbursement = await prisma.disbursementRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        authorizedBy: officerSignature,
      }
    });

    // 3. Send disbursement confirmation back to LAS callback URL (Task 5)
    let callbackSuccess = false;
    let callbackDetails = '';

    try {
      const response = await fetch(LAS_SYSTEM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FS-Webhook-Secret': process.env.WEBHOOK_SECRET || 'fs_secure_secret_key'
        },
        body: JSON.stringify({
          loanReference: disbursement.loanReference,
          disbursementId: disbursement.id,
          status: 'DISBURSED',
          authorizedBy: officerSignature,
          reconciledAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        callbackSuccess = true;
        callbackDetails = `LAS callback accepted. Status code: ${response.status}`;
      } else {
        callbackDetails = `LAS callback accepted but failed. Status code: ${response.status}`;
        console.warn(`⚠️ LAS callback returned status: ${response.status}`);
      }
    } catch (fetchError: any) {
      callbackDetails = `Network error calling LAS system callback: ${fetchError.message || fetchError}`;
      console.warn('🚨 Network failed to broadcast confirmation back to LAS:', fetchError);
    }

    return NextResponse.json({
      success: true,
      message: 'Disbursement request successfully confirmed and posted.',
      disbursement: updatedDisbursement,
      callback: {
        success: callbackSuccess,
        details: callbackDetails
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error confirming disbursement request:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
