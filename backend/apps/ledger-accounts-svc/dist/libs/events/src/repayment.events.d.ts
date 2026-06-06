export interface RepaymentPostedEvent {
    loanReference: string;
    memberId: string;
    memberName: string;
    amount: number | string;
    principalAmount?: number | string;
    serviceFeeAmount?: number | string;
    paymentMethod: string;
    referenceNumber?: string;
}
export interface OverpaymentResolvedEvent {
    repaymentId: string;
    decision: string;
    authorizedBy: string;
}
