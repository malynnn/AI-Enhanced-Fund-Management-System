import { PrismaService } from '../prisma.service';
export declare class ReceiptService {
    private readonly prisma;
    private readonly logger;
    private readonly uploadDir;
    constructor(prisma: PrismaService);
    uploadReceipt(voucherId: string, file: Express.Multer.File): Promise<{
        receiptUrl: string;
        fileName: string;
        fileSizeBytes: number;
    }>;
    private mimeToExt;
}
