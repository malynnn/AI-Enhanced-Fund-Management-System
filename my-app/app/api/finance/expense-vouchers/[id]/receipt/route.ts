// app/api/finance/expense-vouchers/[id]/receipt/route.ts
// FS-006 AC3: Attach scanned receipt / supporting document to each expense entry
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

// Allowed MIME types for receipts
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/finance/expense-vouchers/:id/receipt
// Accepts multipart/form-data with a "receipt" file field
// Saves file to /public/receipts/<voucherNumber>/<filename> and stores path in DB
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const voucher = await prisma.expenseVoucher.findUnique({ where: { id } });
    if (!voucher) {
      return NextResponse.json({ error: 'Expense voucher not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Include the receipt as a "receipt" field in multipart/form-data.' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type "${file.type}". Allowed: JPEG, PNG, WEBP, PDF.` },
        { status: 415 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum allowed is 5 MB.` },
        { status: 413 }
      );
    }

    // Sanitize and build the save path
    const safeVoucherNum = voucher.voucherNumber.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const ext = file.type === 'application/pdf' ? '.pdf' : `.${file.type.split('/')[1]}`;
    const timestamp = Date.now();
    const fileName = `receipt_${timestamp}${ext}`;

    // Save to /public/receipts/<voucherNumber>/
    const uploadDir = path.join(process.cwd(), 'public', 'receipts', safeVoucherNum);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);

    // Public URL path (accessible via Next.js static files)
    const receiptUrl = `/receipts/${safeVoucherNum}/${fileName}`;

    // Update voucher with receipt URL
    const updated = await prisma.expenseVoucher.update({
      where: { id },
      data: { receiptUrl },
    });

    return NextResponse.json(
      {
        ...updated,
        message: 'Receipt uploaded and attached to expense voucher successfully.',
        receiptUrl,
        fileName,
        fileSizeBytes: file.size,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Failed to upload receipt:', error);
    return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 });
  }
}
