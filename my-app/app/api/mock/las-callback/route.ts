// app/api/mock/las-callback/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Print a beautiful confirmation log in the backend console
    console.log('\n=============================================');
    console.log('🤖 MOCK LOAN APPLICATION SYSTEM (LAS) CONFIRMATION');
    console.log('=============================================');
    console.log('Disbursement Notification Received:', JSON.stringify(body, null, 2));
    console.log('=============================================\n');

    return NextResponse.json({ 
      success: true, 
      message: 'Mock LAS successfully logged the disbursement.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Mock LAS Error:', error);
    return NextResponse.json(
      { success: false, error: 'Bad Mock Request' }, 
      { status: 400 }
    );
  }
}
