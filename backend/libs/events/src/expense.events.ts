export interface BudgetUtilizationAlertEvent {
  accountCode: string;
  accountName: string;
  approvedAmount: number;
  totalSpent: number;
  utilizationPercent: number;
  triggeredAt: string; // ISO timestamp
  // Legacy / extended fields
  voucherId?: string;
  overage?: number;
  warningMessage?: string;
}
