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
var DisbursementsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisbursementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const microservices_1 = require("@nestjs/microservices");
const LOAN_FUND_CODE = 'LOAN_BDOEA';
const LOAN_FUND_FALLBACK = 'LN';
let DisbursementsService = DisbursementsService_1 = class DisbursementsService {
    constructor(prisma, lasClient) {
        this.prisma = prisma;
        this.lasClient = lasClient;
        this.logger = new common_1.Logger(DisbursementsService_1.name);
    }
    async findAll() {
        return this.prisma.disbursementRequest.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async confirmDisbursement(id, authorizedBy) {
        const record = await this.prisma.disbursementRequest.findUnique({ where: { id } });
        if (!record) {
            throw new common_1.NotFoundException(`Disbursement request ${id} not found`);
        }
        if (record.status === 'COMPLETED') {
            throw new common_1.BadRequestException('Disbursement is already COMPLETED');
        }
        const updated = await this.prisma.disbursementRequest.update({
            where: { id },
            data: { status: 'COMPLETED', authorizedBy },
        });
        try {
            const event = {
                loanReference: updated.loanReference,
                disbursementId: updated.id,
                status: 'COMPLETED',
                authorizedBy,
                reconciledAt: new Date().toISOString(),
            };
            this.lasClient.emit('disbursement.confirmed', event);
            this.logger.log(`Emitted disbursement.confirmed for ${id} (ref: ${updated.loanReference})`);
        }
        catch (error) {
            this.logger.error(`Failed to emit disbursement.confirmed: ${error.message}`);
        }
        return { ...updated, callbackQueued: true };
    }
    async processLoanApproved(data) {
        const { loanReference, memberId, memberName, amount, paymentMethod, bankAccount, paymentDetails } = data;
        if (!loanReference || !memberId || !memberName || !amount || !paymentMethod || !bankAccount) {
            throw new Error(`Missing required fields: loanReference=${loanReference}, memberId=${memberId}, memberName=${memberName}, amount=${amount}, paymentMethod=${paymentMethod}, bankAccount=${bankAccount}`);
        }
        const disbursementAmount = Number(amount);
        if (isNaN(disbursementAmount) || disbursementAmount <= 0) {
            throw new Error(`Invalid amount: ${amount}`);
        }
        await this.prisma.$transaction(async (tx) => {
            let fund = await tx.fund.findUnique({ where: { code: LOAN_FUND_CODE } });
            if (!fund) {
                this.logger.warn(`Fund ${LOAN_FUND_CODE} not found, falling back to ${LOAN_FUND_FALLBACK}`);
                fund = await tx.fund.findUnique({ where: { code: LOAN_FUND_FALLBACK } });
            }
            if (!fund) {
                throw new Error(`Neither fund code "${LOAN_FUND_CODE}" nor fallback "${LOAN_FUND_FALLBACK}" found`);
            }
            const updatedFund = await tx.fund.update({
                where: { id: fund.id },
                data: { balance: { decrement: disbursementAmount } },
            });
            this.logger.log(`Fund ${updatedFund.code} balance decremented by ${disbursementAmount} → new balance: ${updatedFund.balance}`);
            await tx.fundTransaction.create({
                data: {
                    fundId: fund.id,
                    amount: -disbursementAmount,
                    type: 'LOAN_DISBURSEMENT',
                    description: `Loan disbursement for ${memberName} (ref: ${loanReference})`,
                    referenceId: loanReference,
                },
            });
            await tx.disbursementRequest.create({
                data: {
                    loanReference,
                    memberId,
                    memberName,
                    amount: disbursementAmount,
                    paymentMethod: paymentMethod,
                    bankAccount,
                    paymentDetails: paymentDetails || null,
                    status: 'PENDING',
                    fundId: fund.id,
                },
            });
            this.logger.log(`DisbursementRequest created as PENDING for loan ${loanReference}`);
        });
    }
    async rejectDisbursement(id, reason, authorizedBy) {
        const record = await this.prisma.disbursementRequest.findUnique({ where: { id } });
        if (!record) {
            throw new common_1.NotFoundException(`Disbursement request ${id} not found`);
        }
        if (record.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Disbursement is already ${record.status}`);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const updatedRequest = await tx.disbursementRequest.update({
                where: { id },
                data: { status: 'REJECTED', authorizedBy },
            });
            await tx.fund.update({
                where: { id: record.fundId },
                data: { balance: { increment: record.amount } },
            });
            await tx.fundTransaction.create({
                data: {
                    fundId: record.fundId,
                    amount: record.amount,
                    type: 'CORRECTING_ENTRY',
                    description: `Disbursement Rejected: reversed ₱${record.amount} for ${record.memberName} (ref: ${record.loanReference})`,
                    referenceId: record.loanReference,
                },
            });
            return updatedRequest;
        });
        try {
            const event = {
                loanReference: updated.loanReference,
                disbursementId: updated.id,
                status: 'REJECTED',
                authorizedBy,
                reconciledAt: new Date().toISOString(),
            };
            this.lasClient.emit('disbursement.confirmed', event);
            this.logger.log(`Emitted disbursement.confirmed with status REJECTED for ${id} (ref: ${updated.loanReference})`);
        }
        catch (error) {
            this.logger.error(`Failed to emit disbursement.confirmed: ${error.message}`);
        }
        return updated;
    }
};
exports.DisbursementsService = DisbursementsService;
exports.DisbursementsService = DisbursementsService = DisbursementsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('LAS_CLIENT')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        microservices_1.ClientProxy])
], DisbursementsService);
//# sourceMappingURL=disbursements.service.js.map