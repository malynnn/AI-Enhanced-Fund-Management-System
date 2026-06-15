import { VouchersService } from './vouchers.service';
import { ReceiptService } from './receipt.service';
export declare class VouchersController {
    private readonly vouchersService;
    private readonly receiptService;
    constructor(vouchersService: VouchersService, receiptService: ReceiptService);
    findAll(status?: string): Promise<{
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
    }[]>;
    create(data: any, req: any): Promise<{
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
    }>;
    update(id: string, data: any, req: any): Promise<{
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
    }>;
    delete(id: string, req: any): Promise<{
        success: boolean;
    }>;
    approveOrReject(id: string, decision: 'APPROVED' | 'REJECTED', req: any): Promise<{
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
    }>;
    postVoucher(id: string, req: any): Promise<{
        budgetWarning: boolean;
        budgetWarningMessage: string;
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
    }>;
    uploadReceipt(id: string, file: Express.Multer.File): Promise<{
        receiptUrl: string;
        fileName: string;
        fileSizeBytes: number;
    }>;
}
