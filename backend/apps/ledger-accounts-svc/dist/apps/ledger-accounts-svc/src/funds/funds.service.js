"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let FundsService = class FundsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    shape(fund) {
        return {
            id: fund.id,
            name: fund.name,
            code: fund.code,
            currentBalance: fund.balance,
            history: fund.transactions ?? [],
        };
    }
    async findAll() {
        const funds = await this.prisma.fund.findMany({
            orderBy: { name: 'asc' },
            include: {
                transactions: {
                    orderBy: { timestamp: 'desc' },
                },
            },
        });
        return funds.map((f) => this.shape(f));
    }
    async findById(id) {
        const fund = await this.prisma.fund.findUnique({
            where: { id },
            include: {
                transactions: {
                    orderBy: { timestamp: 'desc' },
                },
            },
        });
        if (!fund) {
            throw new common_1.NotFoundException(`Fund with id "${id}" not found`);
        }
        return this.shape(fund);
    }
};
exports.FundsService = FundsService;
exports.FundsService = FundsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FundsService);
//# sourceMappingURL=funds.service.js.map