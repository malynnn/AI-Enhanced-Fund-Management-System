// app/api/finance/accounts/route.ts
import { NextResponse } from 'next/server';

// This handles your initial page load (The GET 404 error)
export async function GET() {
    // Logic to fetch accounts from the database
    return NextResponse.json([
        { id: 1, code: '1010', name: 'General Cash Fund', type: 'Asset', fund: 'General Fund', status: 'Active' }
    ]);
}

// This handles your "Create Account" button (The POST 404 error)
export async function POST(request: Request) {
    try {
        const body = await request.json(); // This is the formData from our frontend!

        // Logic to save 'body' to Prisma/Database goes here...

        return NextResponse.json({ message: "Account created successfully", data: body }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save account" }, { status: 500 });
    }
}
