// app/api/mock/ms-callback/route.ts
import { NextResponse } from 'next/server';
// 1. Import your new utility (Adjust the path if your lib folder is somewhere else)
import { validateCrossSystemRole } from '../../../../lib/roleMapper'; 

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --- 2. NEW SECURITY CHECK ---
    // Assuming the MS sends their role in a field called 'requesting_role'
    const msRole = body.requesting_role; 
    
    // Validate it
    const { errorResponse, fsRole } = validateCrossSystemRole(msRole);

    // If it fails validation, immediately return the 403 Forbidden response
    if (errorResponse) {
      console.log(`\n❌ SECURITY ALERT: Rejected MS payload. Invalid role: '${msRole}'`);
      return errorResponse; 
    }
    // ------------------------------

    // Just print a flashy message to your terminal so you know it worked!
    console.log('\n=============================================');
    console.log(`🤖 MOCK MEMBERSHIP SYSTEM RECEIVED CONFIRMATION`);
    console.log(`✅ Authorized Access: Mapped to FS Role '${fsRole}'`);
    console.log('=============================================');
    console.log('Payload from Financial System:', JSON.stringify(body, null, 2));
    console.log('=============================================\n');

    // Send a happy 200 OK status back to your Financial webhook
    return NextResponse.json({ 
      success: true, 
      message: 'Mock MS successfully logged the transaction.',
      granted_access_level: fsRole // Optional: send back the mapped role
    }, { status: 200 });

  } catch (error: any) {
    console.error('Mock MS Error:', error);
    return NextResponse.json(
      { success: false, error: 'Bad Mock Request' }, 
      { status: 400 }
    );
  }
}