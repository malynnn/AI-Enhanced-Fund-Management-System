import { BudgetService } from './budget.service';
export declare class BudgetController {
    private readonly budgetService;
    constructor(budgetService: BudgetService);
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
