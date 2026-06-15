import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getDashboard(): Promise<{
        funds: {
            id: string;
            name: string;
            balance: number;
            txCount: number;
        }[];
        ledger: {
            id: string;
            fundId: string;
            date: string;
            desc: string;
            type: string;
            amount: number;
            ref: string;
        }[];
        incomingWebhookQueue: {
            disbursement_txn_id: string;
            loan_ref: string;
            member_id: string;
            member_name: string;
            amount: number;
            date: string;
            payment_method: import(".prisma/client").$Enums.PaymentMethod;
            fund_to_debit: string;
            fund_id: string;
            authorised_by: string;
        }[];
        duesOverview: {
            collectedThisMonth: number;
            targetThisMonth: number;
            collectionRate: number;
            unpaidMembers: number;
        };
        loansOverview: {
            activeLoans: number;
            totalReceivables: number;
            pendingApplications: number;
        };
    } | {
        error: string;
        message: any;
        stack: any;
    }>;
}
