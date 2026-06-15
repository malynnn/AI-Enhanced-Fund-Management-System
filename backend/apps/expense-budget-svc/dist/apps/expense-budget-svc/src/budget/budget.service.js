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
var BudgetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let BudgetService = BudgetService_1 = class BudgetService {
    prisma;
    logger = new common_1.Logger(BudgetService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enrich(category) {
        const result = await this.prisma.expenseVoucher.aggregate({
            _sum: { amount: true },
            where: {
                accountCode: category.accountCode,
                status: 'POSTED',
                date: {
                    gte: new Date(`${category.fiscalYear}-01-01T00:00:00.000Z`),
                    lte: new Date(`${category.fiscalYear}-12-31T23:59:59.999Z`),
                },
            },
        });
        const totalSpent = Number(result._sum.amount ?? 0);
        const approvedAmount = Number(category.approvedAmount);
        const remainingBudget = approvedAmount - totalSpent;
        const utilizationPercent = approvedAmount > 0
            ? parseFloat(((totalSpent / approvedAmount) * 100).toFixed(2))
            : 0;
        const isExceeded = totalSpent > approvedAmount;
        return {
            ...category,
            totalSpent,
            remainingBudget,
            utilizationPercent,
            isExceeded,
        };
    }
    async findAll() {
        const categories = await this.prisma.budgetCategory.findMany({
            orderBy: { fiscalYear: 'desc' },
        });
        return Promise.all(categories.map((c) => this.enrich(c)));
    }
    async findOne(id) {
        const category = await this.prisma.budgetCategory.findUnique({ where: { id } });
        if (!category)
            throw new common_1.NotFoundException(`BudgetCategory ${id} not found`);
        return this.enrich(category);
    }
    async create(data) {
        const account = await this.prisma.chartOfAccount.findUnique({
            where: { code: data.accountCode },
        });
        if (!account) {
            throw new common_1.BadRequestException(`Account code ${data.accountCode} does not exist in ChartOfAccount`);
        }
        const existing = await this.prisma.budgetCategory.findUnique({
            where: {
                accountCode_fiscalYear: {
                    accountCode: data.accountCode,
                    fiscalYear: data.fiscalYear,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Budget category for account code ${data.accountCode} already exists`);
        }
        const category = await this.prisma.budgetCategory.create({ data });
        this.logger.log(`Created budget category for ${data.accountCode} (FY ${data.fiscalYear})`);
        return this.enrich(category);
    }
    async update(id, data) {
        const category = await this.prisma.budgetCategory.findUnique({ where: { id } });
        if (!category)
            throw new common_1.NotFoundException(`BudgetCategory ${id} not found`);
        const updated = await this.prisma.budgetCategory.update({
            where: { id },
            data,
        });
        this.logger.log(`Updated budget category ${id}`);
        return this.enrich(updated);
    }
    async delete(id) {
        const category = await this.prisma.budgetCategory.findUnique({ where: { id } });
        if (!category)
            throw new common_1.NotFoundException(`BudgetCategory ${id} not found`);
        const postedVouchers = await this.prisma.expenseVoucher.count({
            where: {
                accountCode: category.accountCode,
                status: 'POSTED',
            },
        });
        if (postedVouchers > 0) {
            throw new common_1.ConflictException(`Cannot delete: ${postedVouchers} POSTED voucher(s) are linked to account code ${category.accountCode}`);
        }
        await this.prisma.budgetCategory.delete({ where: { id } });
        this.logger.log(`Deleted budget category ${id}`);
        return { success: true };
    }
};
exports.BudgetService = BudgetService;
exports.BudgetService = BudgetService = BudgetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BudgetService);
//# sourceMappingURL=budget.service.js.map