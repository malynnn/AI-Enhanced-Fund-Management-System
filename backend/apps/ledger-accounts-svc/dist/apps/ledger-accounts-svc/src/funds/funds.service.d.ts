import { PrismaService } from '../prisma.service';
export declare class FundsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private shape;
    findAll(): Promise<{
        id: any;
        name: any;
        code: any;
        currentBalance: any;
        history: any;
    }[]>;
    findById(id: string): Promise<{
        id: any;
        name: any;
        code: any;
        currentBalance: any;
        history: any;
    }>;
}
