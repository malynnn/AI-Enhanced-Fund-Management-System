import {
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDir = process.env.UPLOAD_DIR || path.resolve('./uploads/receipts');
    // Ensure directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadReceipt(
    voucherId: string,
    file: Express.Multer.File,
  ): Promise<{ receiptUrl: string; fileName: string; fileSizeBytes: number }> {
    // Validate voucher exists
    const voucher = await this.prisma.expenseVoucher.findUnique({ where: { id: voucherId } });
    if (!voucher) {
      throw new NotFoundException(`Voucher ${voucherId} not found`);
    }

    // Validate MIME type - returns 415 for unsupported
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Unsupported file type: ${file.mimetype}. Allowed: jpeg, png, webp, pdf`,
      );
    }

    // Validate file size - returns 413 if exceeded
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(
        `File size ${file.size} bytes exceeds maximum allowed 5MB (${MAX_FILE_SIZE} bytes)`,
      );
    }

    // Build a unique filename to prevent collisions
    const ext = path.extname(file.originalname) || this.mimeToExt(file.mimetype);
    const fileName = `${voucherId}-${Date.now()}${ext}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Write the buffer to disk
    fs.writeFileSync(filePath, file.buffer);
    this.logger.log(`Receipt saved to ${filePath}`);

    // Update the voucher's receiptUrl
    await this.prisma.expenseVoucher.update({
      where: { id: voucherId },
      data: { receiptUrl: filePath },
    });

    return {
      receiptUrl: filePath,
      fileName,
      fileSizeBytes: file.size,
    };
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    return map[mime] || '';
  }
}
