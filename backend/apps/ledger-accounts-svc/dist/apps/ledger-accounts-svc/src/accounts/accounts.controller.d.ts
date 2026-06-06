import { AccountsService } from './accounts.service';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
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
    findOne(code: string): Promise<{
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
