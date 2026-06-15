import { RmqContext } from '@nestjs/microservices';
import { DuesService } from './dues.service';
import { DuesPayrollConfirmedEvent } from "@backend/events";
export declare class DuesController {
    private readonly duesService;
    private readonly logger;
    constructor(duesService: DuesService);
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    handleDuesEvent(data: DuesPayrollConfirmedEvent, context: RmqContext): Promise<void>;
}
