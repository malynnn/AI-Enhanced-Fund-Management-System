import { PrismaService } from '../prisma.service';
export declare class FundsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        transactions: {
            id: string;
            type: string;
            timestamp: Date;
            fundId: string;
            amount: number;
            description: string;
            referenceId: string | null;
        }[];
    } & {
        id: string;
        code: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        balance: number;
    })[]>;
    findById(id: string): Promise<{
        transactions: {
            id: string;
            type: string;
            timestamp: Date;
            fundId: string;
            amount: number;
            description: string;
            referenceId: string | null;
        }[];
    } & {
        id: string;
        code: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        balance: number;
    }>;
    findByCode(code: string): Promise<{
        transactions: {
            id: string;
            type: string;
            timestamp: Date;
            fundId: string;
            amount: number;
            description: string;
            referenceId: string | null;
        }[];
    } & {
        id: string;
        code: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        balance: number;
    }>;
}
