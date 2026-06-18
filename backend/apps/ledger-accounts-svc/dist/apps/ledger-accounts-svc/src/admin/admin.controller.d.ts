import { PrismaService } from '../prisma.service';
export declare class AdminController {
    private readonly prisma;
    private readonly logger;
    private readonly suspendedUserIds;
    constructor(prisma: PrismaService);
    getUsers(): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
        status: string;
        joinedAt: string;
    }[]>;
    createUser(body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.SystemRole;
    }>;
    toggleUserStatus(id: string, body: {
        status: 'ACTIVE' | 'SUSPENDED';
    }): Promise<{
        success: boolean;
    }>;
    getRequests(): any[];
    getActivityLogs(): Promise<{
        id: string;
        user: string;
        action: string;
        type: string;
        createdAt: string;
    }[]>;
}
