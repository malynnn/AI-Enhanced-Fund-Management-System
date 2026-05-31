// app/api/mock/las-callback/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const isRepayment = body.eventType === 'REPAYMENT_POSTED' || body.principalPaid !== undefined || body.repaymentId !== undefined;

    // Print a beautiful confirmation log in the backend console
    console.log('\n=============================================');
    if (isRepayment) {
      console.log('🤖 MOCK LOAN APPLICATION SYSTEM (LAS) REPAYMENT CALLBACK');
      console.log('=============================================');
      console.log('Repayment Notification Received:', JSON.stringify(body, null, 2));
    } else {
      console.log('🤖 MOCK LOAN APPLICATION SYSTEM (LAS) DISBURSEMENT CALLBACK');
      console.log('=============================================');
      console.log('Disbursement Notification Received:', JSON.stringify(body, null, 2));
    }
    console.log('=============================================\n');

    return NextResponse.json({ 
      success: true, 
      message: isRepayment 
        ? 'Mock LAS successfully logged the repayment posting.' 
        : 'Mock LAS successfully logged the disbursement.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Mock LAS Error:', error);
    return NextResponse.json(
      { success: false, error: 'Bad Mock Request' }, 
      { status: 400 }
    );
  }
}
