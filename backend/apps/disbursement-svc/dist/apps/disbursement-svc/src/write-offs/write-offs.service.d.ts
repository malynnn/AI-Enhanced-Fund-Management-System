import { PrismaService } from '../prisma.service';
import { ClientProxy } from '@nestjs/microservices';
export declare class WriteOffsService {
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
        status: import(".prisma/client").$Enums.WriteOffStatus;
        authorizedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        reason: string;
        requestedBy: string;
    }[]>;
    createWriteOffRequest(data: {
        loanReference: string;
        memberId: string;
        memberName: string;
        amount: number;
        reason: string;
        requestedBy: string;
    }): Promise<{
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
    approveOrRejectWriteOff(loanReference: string, decision: 'APPROVED' | 'REJECTED', authorizedBy: string): Promise<{
        success: boolean;
        loanReference: string;
        decision: "APPROVED" | "REJECTED";
    }>;
}
