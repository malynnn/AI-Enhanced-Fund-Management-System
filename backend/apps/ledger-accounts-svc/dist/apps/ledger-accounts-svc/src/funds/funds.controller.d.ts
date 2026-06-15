import { FundsService } from './funds.service';
export declare class FundsController {
    private readonly fundsService;
    constructor(fundsService: FundsService);
    findAll(): Promise<{
        id: any;
        name: any;
        code: any;
        currentBalance: any;
        history: any;
    }[]>;
    transferFunds(sourceId: string, destId: string, amount: number, notes: string): Promise<{
        success: boolean;
        message: string;
    }>;
    findOne(id: string): Promise<{
        id: any;
        name: any;
        code: any;
        currentBalance: any;
        history: any;
    }>;
}
