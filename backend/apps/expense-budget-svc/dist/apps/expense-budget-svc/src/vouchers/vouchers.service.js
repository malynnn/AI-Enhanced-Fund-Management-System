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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VouchersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VouchersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const microservices_1 = require("@nestjs/microservices");
let VouchersService = VouchersService_1 = class VouchersService {
    prisma;
    auditClient;
    budgetClient;
    logger = new common_1.Logger(VouchersService_1.name);
    constructor(prisma, auditClient, budgetClient) {
        this.prisma = prisma;
        this.auditClient = auditClient;
        this.budgetClient = budgetClient;
    }
    async emitAudit(action, entityId, details, user) {
        try {
            this.auditClient.emit('audit.log', {
                action,
                entityType: 'ExpenseVoucher',
                entityId,
                details,
                user,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            this.logger.error(`Failed to emit audit event: ${err.message}`);
        }
    }
    async findAll(status) {
        const { VoucherStatus } = require('@prisma/client');
        const where = status && Object.values(VoucherStatus).includes(status)
            ? { status: status }
            : {};
        return this.prisma.expenseVoucher.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(data, user) {
        if (!data.voucherNumber || !data.date || !data.payee || !data.purpose || !data.amount || !data.accountCode) {
            throw new common_1.BadRequestException('Missing required fields for voucher');
        }
        const existing = await this.prisma.expenseVoucher.findUnique({
            where: { voucherNumber: data.voucherNumber },
        });
        if (existing) {
            throw new common_1.ConflictException(`Voucher number ${data.voucherNumber} already exists`);
        }
        const voucher = await this.prisma.expenseVoucher.create({
            data: {
                ...data,
                date: new Date(data.date),
                status: (data.status || 'PENDING'),
            },
        });
        this.logger.log(`Created voucher ${voucher.voucherNumber}`);
        this.emitAudit('CREATE_VOUCHER', voucher.id, data, user);
        return voucher;
    }
    async update(id, data, user) {
        const voucher = await this.prisma.expenseVoucher.findUnique({ where: { id } });
        if (!voucher) {
            throw new common_1.NotFoundException(`Voucher ${id} not found`);
        }
        if (voucher.status !== 'PENDING') {
            throw new common_1.ConflictException(`Only PENDING vouchers can be edited (current status: ${voucher.status})`);
        }
        if (data.voucherNumber && data.voucherNumber !== voucher.voucherNumber) {
            const existing = await this.prisma.expenseVoucher.findUnique({
                where: { voucherNumber: data.voucherNumber },
            });
            if (existing) {
                throw new common_1.ConflictException(`Voucher number ${data.voucherNumber} already exists`);
            }
        }
        const updatedData = { ...data };
        if (updatedData.date) {
            updatedData.date = new Date(updatedData.date);
        }
        const updated = await this.prisma.expenseVoucher.update({
            where: { id },
            data: updatedData,
        });
        this.logger.log(`Updated voucher ${voucher.voucherNumber}`);
        this.emitAudit('UPDATE_VOUCHER', id, data, user);
        return updated;
    }
    async delete(id, user) {
        const voucher = await this.prisma.expenseVoucher.findUnique({ where: { id } });
        if (!voucher) {
            throw new common_1.NotFoundException(`Voucher ${id} not found`);
        }
        if (voucher.status !== 'PENDING') {
            throw new common_1.ConflictException(`Only PENDING vouchers can be deleted (current status: ${voucher.status})`);
        }
        await this.prisma.expenseVoucher.delete({ where: { id } });
        this.logger.log(`Deleted voucher ${voucher.voucherNumber}`);
        this.emitAudit('DELETE_VOUCHER', id, { voucherNumber: voucher.voucherNumber }, user);
        return { success: true };
    }
    async approveOrReject(id, decision, authorizedBy) {
        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            throw new common_1.BadRequestException(`Invalid decision: ${decision}`);
        }
        const voucher = await this.prisma.expenseVoucher.findUnique({ where: { id } });
        if (!voucher) {
            throw new common_1.NotFoundException(`Voucher ${id} not found`);
        }
        if (voucher.status !== 'PENDING') {
            throw new common_1.ConflictException(`Only PENDING vouchers can be approved/rejected (current status: ${voucher.status})`);
        }
        const updated = await this.prisma.expenseVoucher.update({
            where: { id },
            data: {
                status: decision,
                approvedBy: authorizedBy,
            },
        });
        this.logger.log(`Voucher ${voucher.voucherNumber} resolved as ${decision}`);
        this.emitAudit('RESOLVE_VOUCHER', id, { decision, authorizedBy }, authorizedBy);
        return updated;
    }
    async post(id, user) {
        const voucher = await this.prisma.expenseVoucher.findUnique({ where: { id } });
        if (!voucher)
            throw new common_1.NotFoundException(`Voucher ${id} not found`);
        if (voucher.status !== 'APPROVED') {
            const { ForbiddenException } = require('@nestjs/common');
            throw new ForbiddenException(`Only APPROVED vouchers can be posted (current status: ${voucher.status})`);
        }
        const fiscalYear = new Date(voucher.date).getFullYear();
        const budgetCategory = await this.prisma.budgetCategory.findUnique({
            where: {
                accountCode_fiscalYear: {
                    accountCode: voucher.accountCode,
                    fiscalYear,
                },
            },
        });
        let budgetWarning = false;
        let budgetWarningMessage = '';
        let utilization = 0;
        if (budgetCategory) {
            const result = await this.prisma.expenseVoucher.aggregate({
                _sum: { amount: true },
                where: {
                    accountCode: voucher.accountCode,
                    status: 'POSTED',
                },
            });
            const currentSpent = Number(result._sum.amount ?? 0);
            const projectedTotal = currentSpent + Number(voucher.amount);
            if (projectedTotal > Number(budgetCategory.approvedAmount)) {
                budgetWarning = true;
                budgetWarningMessage = `Warning: Posting this voucher exceeds the budget ceiling for ${voucher.accountCode}`;
            }
            utilization = projectedTotal / Number(budgetCategory.approvedAmount);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const updatedVoucher = await tx.expenseVoucher.update({
                where: { id },
                data: {
                    status: 'POSTED',
                    postedAt: new Date(),
                },
            });
            const gf = await tx.fund.findUnique({ where: { code: 'GEN' } });
            if (!gf) {
                throw new common_1.NotFoundException('General Fund (code: GEN) not found');
            }
            await tx.fund.update({
                where: { id: gf.id },
                data: { balance: { decrement: voucher.amount } },
            });
            await tx.fundTransaction.create({
                data: {
                    fundId: gf.id,
                    amount: voucher.amount,
                    type: 'WITHDRAWAL',
                    description: `Disbursement for ${voucher.purpose}`,
                    referenceId: voucher.id,
                },
            });
            return updatedVoucher;
        });
        if (budgetCategory && utilization >= 0.8) {
            setImmediate(() => {
                try {
                    const utilizationPercent = parseFloat((utilization * 100).toFixed(2));
                    const payload = {
                        accountCode: voucher.accountCode,
                        accountName: budgetCategory.accountName,
                        approvedAmount: Number(budgetCategory.approvedAmount),
                        totalSpent: Number(budgetCategory.approvedAmount) * utilization,
                        utilizationPercent,
                        triggeredAt: new Date().toISOString(),
                        voucherId: voucher.id,
                    };
                    if (budgetWarning) {
                        payload.warningMessage = budgetWarningMessage;
                    }
                    this.budgetClient.emit('budget.utilization.alert', payload);
                    this.logger.log(`Budget alert published for ${voucher.accountCode}: ${utilizationPercent}% utilized`);
                }
                catch (err) {
                    this.logger.error(`[FIRE-AND-FORGET] Failed to publish budget.utilization.alert: ${err?.message}`);
                }
            });
        }
        this.logger.log(`Voucher ${voucher.voucherNumber} posted`);
        this.emitAudit('POST_VOUCHER', id, { amount: voucher.amount }, user);
        return { ...updated, budgetWarning, budgetWarningMessage };
    }
};
exports.VouchersService = VouchersService;
exports.VouchersService = VouchersService = VouchersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('AUDIT_CLIENT')),
    __param(2, (0, common_1.Inject)('BUDGET_ALERTS_CLIENT')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        microservices_1.ClientProxy,
        microservices_1.ClientProxy])
], VouchersService);
//# sourceMappingURL=vouchers.service.js.map