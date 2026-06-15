import { AccountType } from '@prisma/client';
export declare class CreateAccountDto {
    code: string;
    name: string;
    type: AccountType;
    fund: string;
}
