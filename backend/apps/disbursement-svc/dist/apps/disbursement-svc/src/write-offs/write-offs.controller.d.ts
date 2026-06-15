import { WriteOffsService } from './write-offs.service';
export declare class WriteOffsController {
    private readonly writeOffsService;
    private readonly logger;
    constructor(writeOffsService: WriteOffsService);
    findAll(): Promise<{
        id: string;
        loanReference: string;
        memberId: string;
        memberName: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.WriteOffStatus;
        authorizedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        reason: string;
        requestedBy: string;
    }[]>;
    createRequest(loanReference: string, memberId: string, memberName: string, amount: number, reason: string, requestedBy: string): Promise<{
        id: string;
        loanReference: string;
        memberId: string;
        memberName: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.WriteOffStatus;
        authorizedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        reason: string;
        requestedBy: string;
    }>;
    approveOrReject(loanReference: string, decision: 'APPROVED' | 'REJECTED', authorizedBy: string): Promise<{
        success: boolean;
        loanReference: string;
        decision: "APPROVED" | "REJECTED";
    }>;
}
