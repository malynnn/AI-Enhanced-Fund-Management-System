import { AccountType, AccountStatus } from '@prisma/client';
export declare class UpdateAccountDto {
    name?: string;
    type?: AccountType;
    fund?: string;
    status?: AccountStatus;
}
