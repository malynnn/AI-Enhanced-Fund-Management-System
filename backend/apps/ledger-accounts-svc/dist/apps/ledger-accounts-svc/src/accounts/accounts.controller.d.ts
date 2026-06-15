import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
    findAll(): Promise<{
        fund: string;
        id: string;
        code: string;
        name: string;
        type: import(".prisma/client").$Enums.AccountType;
        status: import(".prisma/client").$Enums.AccountStatus;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        fund: string;
        id: string;
        code: string;
        name: string;
        type: import(".prisma/client").$Enums.AccountType;
        status: import(".prisma/client").$Enums.AccountStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(dto: CreateAccountDto): Promise<{
        fund: string;
        id: string;
        code: string;
        name: string;
        type: import(".prisma/client").$Enums.AccountType;
        status: import(".prisma/client").$Enums.AccountStatus;
        createdAt: Date;
        updatedAt: Date;
    } | {
        error: string;
        message: any;
        stack: any;
    }>;
    update(id: string, dto: UpdateAccountDto): Promise<{
        fund: string;
        id: string;
        code: string;
        name: string;
        type: import(".prisma/client").$Enums.AccountType;
        status: import(".prisma/client").$Enums.AccountStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
    softDelete(id: string): Promise<{
        fund: string;
        id: string;
        code: string;
        name: string;
        type: import(".prisma/client").$Enums.AccountType;
        status: import(".prisma/client").$Enums.AccountStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
