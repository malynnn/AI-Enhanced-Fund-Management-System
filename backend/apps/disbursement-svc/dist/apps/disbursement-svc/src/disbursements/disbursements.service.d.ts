import { PrismaService } from '../prisma.service';
import { LoanApprovedEvent } from "@backend/events";
import { ClientProxy } from '@nestjs/microservices';
export declare class DisbursementsService {
    private readonly prisma;
    private readonly lasClient;
    private readonly logger;
    constructor(prisma: PrismaService, lasClient: ClientProxy);
    findAll(): Promise<{
        id: string;
        loanReference: string;
        memberId: string;
        memberName: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        bankAccount: string;
        paymentDetails: string | null;
        status: import(".prisma/client").$Enums.DisbursementStatus;
        authorizedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        fundId: string;
    }[]>;
    confirmDisbursement(id: string, authorizedBy: string): Promise<{
        callbackQueued: boolean;
        id: string;
        loanReference: string;
        memberId: string;
        memberName: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        bankAccount: string;
        paymentDetails: string | null;
        status: import(".prisma/client").$Enums.DisbursementStatus;
        authorizedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        fundId: string;
    }>;
    processLoanApproved(data: LoanApprovedEvent): Promise<void>;
    rejectDisbursement(id: string, reason: string, authorizedBy: string): Promise<{
        id: string;
        loanReference: string;
        memberId: string;
        memberName: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        bankAccount: string;
        paymentDetails: string | null;
        status: import(".prisma/client").$Enums.DisbursementStatus;
        authorizedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        fundId: string;
    }>;
}
