import { AccountType, AccountStatus } from '@prisma/client';

export class UpdateAccountDto {
  name?: string;
  type?: AccountType;
  fund?: string;
  status?: AccountStatus;
}
