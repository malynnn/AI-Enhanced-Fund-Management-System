export class CreateAccountDto {
  code: string;
  name: string;
  type: string;  // Asset | Liability | Equity | Income | Expense
  fund: string;
}
