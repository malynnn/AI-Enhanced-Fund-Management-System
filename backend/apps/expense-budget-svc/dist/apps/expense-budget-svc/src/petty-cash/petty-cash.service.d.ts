import { PrismaService } from '../prisma.service';
export declare class PettyCashService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private getCurrentBalance;
    private getSummary;
    findAll(): Promise<{
        transactions: ({
            voucher: {
                status: import(".prisma/client").$Enums.VoucherStatus;
                id: string;
                voucherNumber: string;
                payee: string;
                purpose: string;
                amount: import("@prisma/client/runtime/library").Decimal;
            } | null;
        } & {
            id: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            createdAt: Date;
            type: import(".prisma/client").$Enums.PettyCashType;
            description: string;
            runningBalance: import("@prisma/client/runtime/library").Decimal;
            referenceVoucherId: string | null;
            transactedAt: Date;
        })[];
        currentBalance: number;
        totalReplenishments: number;
        totalDisbursements: number;
    }>;
    findOne(id: string): Promise<{
        voucher: {
            status: import(".prisma/client").$Enums.VoucherStatus;
            id: string;
            voucherNumber: string;
            date: Date;
            payee: string;
            purpose: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            accountCode: string;
            approvedBy: string | null;
            receiptUrl: string | null;
            postedAt: Date | null;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        type: import(".prisma/client").$Enums.PettyCashType;
        description: string;
        runningBalance: import("@prisma/client/runtime/library").Decimal;
        referenceVoucherId: string | null;
        transactedAt: Date;
    }>;
    create(data: {
        type: string;
        amount: number;
        description: string;
        referenceVoucherId?: string;
    }): Promise<{
        voucher: {
            status: import(".prisma/client").$Enums.VoucherStatus;
            id: string;
            voucherNumber: string;
            date: Date;
            payee: string;
            purpose: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            accountCode: string;
            approvedBy: string | null;
            receiptUrl: string | null;
            postedAt: Date | null;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        type: import(".prisma/client").$Enums.PettyCashType;
        description: string;
        runningBalance: import("@prisma/client/runtime/library").Decimal;
        referenceVoucherId: string | null;
        transactedAt: Date;
    }>;
}
