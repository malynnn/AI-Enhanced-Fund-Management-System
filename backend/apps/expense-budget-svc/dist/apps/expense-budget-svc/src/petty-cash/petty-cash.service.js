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
var PettyCashService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PettyCashService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const VALID_TYPES = ['REPLENISHMENT', 'DISBURSEMENT'];
let PettyCashService = PettyCashService_1 = class PettyCashService {
    prisma;
    logger = new common_1.Logger(PettyCashService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCurrentBalance() {
        const last = await this.prisma.pettyCashTransaction.findFirst({
            orderBy: { transactedAt: 'desc' },
            select: { runningBalance: true },
        });
        return last ? Number(last.runningBalance) : 0;
    }
    async getSummary() {
        const [replenishments, disbursements] = await Promise.all([
            this.prisma.pettyCashTransaction.aggregate({
                _sum: { amount: true },
                where: { type: 'REPLENISHMENT' },
            }),
            this.prisma.pettyCashTransaction.aggregate({
                _sum: { amount: true },
                where: { type: 'DISBURSEMENT' },
            }),
        ]);
        const totalReplenishments = Number(replenishments._sum.amount ?? 0);
        const totalDisbursements = Number(disbursements._sum.amount ?? 0);
        const currentBalance = totalReplenishments - totalDisbursements;
        return { currentBalance, totalReplenishments, totalDisbursements };
    }
    async findAll() {
        const [transactions, summary] = await Promise.all([
            this.prisma.pettyCashTransaction.findMany({
                orderBy: { transactedAt: 'desc' },
                include: {
                    voucher: {
                        select: {
                            id: true,
                            voucherNumber: true,
                            payee: true,
                            purpose: true,
                            amount: true,
                            status: true,
                        },
                    },
                },
            }),
            this.getSummary(),
        ]);
        return { ...summary, transactions };
    }
    async findOne(id) {
        const tx = await this.prisma.pettyCashTransaction.findUnique({
            where: { id },
            include: { voucher: true },
        });
        if (!tx)
            throw new common_1.NotFoundException(`PettyCashTransaction ${id} not found`);
        return tx;
    }
    async create(data) {
        if (!VALID_TYPES.includes(data.type)) {
            throw new common_1.BadRequestException(`Invalid type: ${data.type}. Must be REPLENISHMENT or DISBURSEMENT`);
        }
        if (!data.amount || data.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        if (!data.description || data.description.trim() === '') {
            throw new common_1.BadRequestException('Description is required');
        }
        if (data.referenceVoucherId) {
            const voucher = await this.prisma.expenseVoucher.findUnique({
                where: { id: data.referenceVoucherId },
            });
            if (!voucher) {
                throw new common_1.NotFoundException(`Referenced voucher ${data.referenceVoucherId} not found`);
            }
            if (!['APPROVED', 'POSTED'].includes(voucher.status)) {
                throw new common_1.BadRequestException(`Referenced voucher must be APPROVED or POSTED (current status: ${voucher.status})`);
            }
        }
        const currentBalance = await this.getCurrentBalance();
        if (data.type === 'DISBURSEMENT' && currentBalance - data.amount < 0) {
            throw new common_1.UnprocessableEntityException(`Disbursement of ${data.amount} would exceed current balance of ${currentBalance}`);
        }
        const runningBalance = data.type === 'REPLENISHMENT'
            ? currentBalance + data.amount
            : currentBalance - data.amount;
        const { PettyCashType } = require('@prisma/client');
        const tx = await this.prisma.pettyCashTransaction.create({
            data: {
                type: data.type,
                amount: data.amount,
                description: data.description,
                runningBalance,
                referenceVoucherId: data.referenceVoucherId || null,
            },
            include: { voucher: true },
        });
        this.logger.log(`PettyCash ${data.type} of ${data.amount} recorded. New balance: ${runningBalance}`);
        return tx;
    }
};
exports.PettyCashService = PettyCashService;
exports.PettyCashService = PettyCashService = PettyCashService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PettyCashService);
//# sourceMappingURL=petty-cash.service.js.map