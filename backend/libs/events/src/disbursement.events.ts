export interface LoanApprovedEvent {
  loanReference: string;
  memberId: string;
  memberName: string;
  amount: number | string;
  paymentMethod: string;
  bankAccount: string;
  paymentDetails?: string;
}

export interface DisbursementConfirmedEvent {
  loanReference: string;
  disbursementId: string;
  status: string;
  authorizedBy: string;
  reconciledAt: string;
}
