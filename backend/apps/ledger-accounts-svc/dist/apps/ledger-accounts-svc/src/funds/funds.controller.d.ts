import { FundsService } from './funds.service';
export declare class FundsController {
    private readonly fundsService;
    constructor(fundsService: FundsService);
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
    findOne(id: string): Promise<{
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
