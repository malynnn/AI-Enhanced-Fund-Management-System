export interface BudgetUtilizationAlertEvent {
    accountCode: string;
    accountName: string;
    approvedAmount: number;
    totalSpent: number;
    utilizationPercent: number;
    triggeredAt: string;
    voucherId?: string;
    overage?: number;
    warningMessage?: string;
}
