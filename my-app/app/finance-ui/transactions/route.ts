import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET: View Transactions (Allowed for Admin, Treasurer, and Internal Auditor)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session  !['Admin', 'Treasurer', 'Internal Auditor'].includes(role)) {
    return NextResponse.json({ error: "403 Forbidden" }, { status: 403 });
  }

  // ... fetch and return transactions from database
  return NextResponse.json({ message: "Transactions retrieved successfully" });
}

// POST: Create Transactions (Allowed ONLY for Admin and Treasurer)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  // Notice: Internal Auditor is excluded here to enforce "Read-Only"
  if (!session  !['Admin', 'Treasurer'].includes(role)) {
    return NextResponse.json({ error: "403 Forbidden: You do not have posting privileges." }, { status: 403 });
  }

  // ... process and save the transaction to the database
  return NextResponse.json({ message: "Transaction posted successfully" }, { status: 201 });
}