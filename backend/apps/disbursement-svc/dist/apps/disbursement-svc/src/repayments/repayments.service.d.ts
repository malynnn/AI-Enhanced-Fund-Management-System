import { PrismaService } from '../prisma.service';
import { RepaymentPostedEvent } from "@backend/events";
import { ClientProxy } from '@nestjs/microservices';
export declare class RepaymentsService {
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
    findOverpayments(): Promise<{
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
    resolveOverpayment(repaymentId: string, decision: 'ADVANCE_CREDIT' | 'REFUND', authorizedBy: string): Promise<{
        success: boolean;
        repaymentId: string;
        decision: "ADVANCE_CREDIT" | "REFUND";
    }>;
    processRepayment(data: RepaymentPostedEvent): Promise<void>;
}
