export interface BudgetUtilizationAlertEvent {
    voucherId?: string;
    accountCode?: string;
    accountName?: string;
    approvedBudget?: number;
    projectedTotal?: number;
    overage?: number;
    warningMessage: string;
}
