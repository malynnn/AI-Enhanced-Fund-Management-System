export interface DuesPayrollConfirmedEvent {
  transactionId: string;
  date: string;
  memberId: string;
  fullName: string;
  monthCovered: string;
  amount: number | string;
  paymentMethod: string;
  referenceNumber?: string;
  fundCredited: string;
}
