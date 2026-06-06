import { PrismaService } from '../prisma.service';
export declare class AccountsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        fund: string;
        id: string;
        code: string;
        name: string;
        type: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findByCode(code: string): Promise<{
        fund: string;
        id: string;
        code: string;
        name: string;
        type: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
