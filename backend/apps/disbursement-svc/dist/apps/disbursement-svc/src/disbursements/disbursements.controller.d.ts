import { RmqContext } from '@nestjs/microservices';
import { DisbursementsService } from './disbursements.service';
import { LoanApprovedEvent } from "@backend/events";
export declare class DisbursementsController {
    private readonly disbursementsService;
    private readonly logger;
    constructor(disbursementsService: DisbursementsService);
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
    confirm(id: string, authorizedBy: string): Promise<{
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
    reject(id: string, reason: string, authorizedBy: string): Promise<{
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
    handleLoanApproved(data: LoanApprovedEvent, context: RmqContext): Promise<void>;
}
