import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  code: string;
  name: string;
  type: AccountType;
  fund: string;
}
