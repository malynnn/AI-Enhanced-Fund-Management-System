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
    findOne(id: string): Promise<{
        id: any;
        name: any;
        code: any;
        currentBalance: any;
        history: any;
    }>;
}
