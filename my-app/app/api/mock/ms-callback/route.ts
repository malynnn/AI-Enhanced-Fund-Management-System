// app/api/mock/ms-callback/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Just print a flashy message to your terminal so you know it worked!
    console.log('\n=============================================');
    console.log('🤖 MOCK MEMBERSHIP SYSTEM RECEIVED CONFIRMATION');
    console.log('=============================================');
    console.log('Payload from Financial System:', JSON.stringify(body, null, 2));
    console.log('=============================================\n');

    // Send a happy 200 OK status back to your Financial webhook
    return NextResponse.json({ 
      success: true, 
      message: 'Mock MS successfully logged the transaction.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Mock MS Error:', error);
    return NextResponse.json(
      { success: false, error: 'Bad Mock Request' }, 
      { status: 400 }
    );
  }
}