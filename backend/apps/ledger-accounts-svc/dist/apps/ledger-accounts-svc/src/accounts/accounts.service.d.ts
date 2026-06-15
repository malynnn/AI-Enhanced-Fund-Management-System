import { PrismaService } from '../prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
export declare class AccountsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    findById(id: string): Promise<{
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
