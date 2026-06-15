import { RmqContext } from '@nestjs/microservices';
import { RepaymentsService } from './repayments.service';
import { RepaymentPostedEvent } from "@backend/events";
export declare class RepaymentsController {
    private readonly repaymentsService;
    private readonly logger;
    constructor(repaymentsService: RepaymentsService);
    findAll(): Promise<{
        id: string;
        loanReference: string;
        memberId: string;
        memberName: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        status: import(".prisma/client").$Enums.RepaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        principalAmount: import("@prisma/client/runtime/library").Decimal;
        serviceFeeAmount: import("@prisma/client/runtime/library").Decimal;
        overpaymentAmount: import("@prisma/client/runtime/library").Decimal;
        referenceNumber: string | null;
        treasurerDecision: import(".prisma/client").$Enums.TreasurerDecision;
        processedAt: Date;
    }[]>;
    handleRepaymentPosted(data: RepaymentPostedEvent, context: RmqContext): Promise<void>;
}
