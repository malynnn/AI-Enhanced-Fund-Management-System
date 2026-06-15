import { PrismaService } from '../prisma.service';
export declare class BudgetService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private enrich;
    findAll(): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(data: {
        accountCode: string;
        accountName: string;
        approvedAmount: number;
        fiscalYear: number;
    }): Promise<any>;
    update(id: string, data: Partial<{
        accountName: string;
        approvedAmount: number;
        fiscalYear: number;
    }>): Promise<any>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
