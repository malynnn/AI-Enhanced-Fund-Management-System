import { PrismaService } from '../prisma.service';
import { DuesPayrollConfirmedEvent } from "@backend/events";
import { ClientProxy } from '@nestjs/microservices';
export declare class DuesService {
    private readonly prisma;
    private readonly ledgerClient;
    private readonly repaymentsClient;
    private readonly logger;
    constructor(prisma: PrismaService, ledgerClient: ClientProxy, repaymentsClient: ClientProxy);
    processDuesEvent(data: DuesPayrollConfirmedEvent): Promise<void>;
    findAll(status?: string): Promise<{
        id: string;
        transactionId: string;
        memberId: string;
        name: string;
        month: string;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        method: import(".prisma/client").$Enums.PaymentMethod;
        referenceNumber: string | null;
        fundToCredit: string;
        status: import(".prisma/client").$Enums.DuesStatus;
        collectionType: import(".prisma/client").$Enums.CollectionType;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    confirmDues(id: string): Promise<{
        id: string;
        transactionId: string;
        memberId: string;
        name: string;
        month: string;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        method: import(".prisma/client").$Enums.PaymentMethod;
        referenceNumber: string | null;
        fundToCredit: string;
        status: import(".prisma/client").$Enums.DuesStatus;
        collectionType: import(".prisma/client").$Enums.CollectionType;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createCollection(payload: any): Promise<{
        id: string;
        transactionId: string;
        memberId: string;
        name: string;
        month: string;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        method: import(".prisma/client").$Enums.PaymentMethod;
        referenceNumber: string | null;
        fundToCredit: string;
        status: import(".prisma/client").$Enums.DuesStatus;
        collectionType: import(".prisma/client").$Enums.CollectionType;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
