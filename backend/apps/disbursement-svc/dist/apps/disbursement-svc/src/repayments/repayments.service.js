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
var RepaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const microservices_1 = require("@nestjs/microservices");
const LOAN_FUND_CODE = 'LOAN_BDOEA';
const LOAN_FUND_FALLBACK = 'LN';
const GENERAL_FUND_CODE = 'GF';
let RepaymentsService = RepaymentsService_1 = class RepaymentsService {
    constructor(prisma, lasClient) {
        this.prisma = prisma;
        this.lasClient = lasClient;
        this.logger = new common_1.Logger(RepaymentsService_1.name);
    }
    async findAll() {
        return this.prisma.loanRepayment.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOverpayments() {
        return this.prisma.loanRepayment.findMany({
            where: { overpaymentAmount: { gt: 0 } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async resolveOverpayment(repaymentId, decision, authorizedBy) {
        if (!['ADVANCE_CREDIT', 'REFUND'].includes(decision)) {
            throw new Error(`Invalid decision: ${decision}`);
        }
        const repayment = await this.prisma.loanRepayment.findUnique({ where: { id: repaymentId } });
        if (!repayment) {
            throw new Error(`Loan repayment ${repaymentId} not found`);
        }
        if (repayment.status !== 'OVERPAYMENT_PENDING') {
            throw new Error(`Repayment is not pending overpayment resolution (current status: ${repayment.status})`);
        }
        const overpaymentAmount = repayment.overpaymentAmount;
        await this.prisma.$transaction(async (tx) => {
            if (decision === 'ADVANCE_CREDIT') {
                let loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_CODE } });
                if (!loanFund)
                    loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_FALLBACK } });
                if (!loanFund)
                    throw new Error(`Loan fund not found for advance credit`);
                await tx.fund.update({
                    where: { id: loanFund.id },
                    data: { balance: { increment: overpaymentAmount } },
                });
                await tx.fundTransaction.create({
                    data: {
                        fundId: loanFund.id,
                        amount: overpaymentAmount,
                        type: 'DEPOSIT',
                        description: `Advance credit for overpayment from ${repayment.memberName} (ref: ${repayment.loanReference})`,
                        referenceId: repayment.loanReference,
                    },
                });
            }
            else if (decision === 'REFUND') {
                const generalFund = await tx.fund.findUnique({ where: { code: GENERAL_FUND_CODE } });
                if (!generalFund)
                    throw new Error(`General fund not found for refund`);
                await tx.fund.update({
                    where: { id: generalFund.id },
                    data: { balance: { decrement: overpaymentAmount } },
                });
                await tx.fundTransaction.create({
                    data: {
                        fundId: generalFund.id,
                        amount: -overpaymentAmount,
                        type: 'WITHDRAWAL',
                        description: `Refund for overpayment to ${repayment.memberName} (ref: ${repayment.loanReference})`,
                        referenceId: repayment.loanReference,
                    },
                });
            }
            const newStatus = decision === 'ADVANCE_CREDIT' ? 'OVERPAYMENT_CREDITED' : 'OVERPAYMENT_REFUNDED';
            await tx.loanRepayment.update({
                where: { id: repaymentId },
                data: {
                    status: newStatus,
                    treasurerDecision: decision,
                },
            });
            this.logger.log(`Overpayment for ${repaymentId} resolved as ${decision} (${newStatus})`);
        });
        try {
            this.lasClient.emit('overpayment.resolved', {
                repaymentId,
                decision,
                authorizedBy,
            });
            this.logger.log(`Emitted overpayment.resolved for ${repaymentId}`);
        }
        catch (error) {
            this.logger.error(`Failed to emit overpayment.resolved: ${error.message}`);
        }
        return { success: true, repaymentId, decision };
    }
    async processRepayment(data) {
        const { loanReference, memberId, memberName, amount, principalAmount, serviceFeeAmount, paymentMethod, referenceNumber, } = data;
        if (!loanReference || !memberId || !memberName || !amount || !paymentMethod) {
            throw new Error(`Missing required fields: loanReference=${loanReference}, memberId=${memberId}, memberName=${memberName}, amount=${amount}, paymentMethod=${paymentMethod}`);
        }
        const totalAmount = Number(amount);
        const principal = Number(principalAmount ?? 0);
        const serviceFee = Number(serviceFeeAmount ?? 0);
        if (isNaN(totalAmount) || totalAmount <= 0) {
            throw new Error(`Invalid amount: ${amount}`);
        }
        const overpaymentAmount = Math.max(0, totalAmount - (principal + serviceFee));
        const status = overpaymentAmount > 0 ? 'OVERPAYMENT_PENDING' : 'PROCESSED';
        await this.prisma.$transaction(async (tx) => {
            let loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_CODE } });
            if (!loanFund) {
                this.logger.warn(`Fund ${LOAN_FUND_CODE} not found, falling back to ${LOAN_FUND_FALLBACK}`);
                loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_FALLBACK } });
            }
            if (!loanFund) {
                throw new Error(`Neither fund "${LOAN_FUND_CODE}" nor fallback "${LOAN_FUND_FALLBACK}" found`);
            }
            const generalFund = await tx.fund.findUnique({ where: { code: GENERAL_FUND_CODE } });
            if (!generalFund) {
                throw new Error(`General Fund "${GENERAL_FUND_CODE}" not found`);
            }
            const creditToPrincipal = principal > 0 ? principal : totalAmount - serviceFee;
            await tx.fund.update({
                where: { id: loanFund.id },
                data: { balance: { increment: creditToPrincipal } },
            });
            if (serviceFee > 0) {
                await tx.fund.update({
                    where: { id: generalFund.id },
                    data: { balance: { increment: serviceFee } },
                });
            }
            await tx.fundTransaction.create({
                data: {
                    fundId: loanFund.id,
                    amount: creditToPrincipal,
                    type: 'DEPOSIT',
                    description: `Principal repayment from ${memberName} (ref: ${loanReference})`,
                    referenceId: loanReference,
                },
            });
            if (serviceFee > 0) {
                await tx.fundTransaction.create({
                    data: {
                        fundId: generalFund.id,
                        amount: serviceFee,
                        type: 'CORRECTING_ENTRY',
                        description: `Service fee from ${memberName} (ref: ${loanReference})`,
                        referenceId: loanReference,
                    },
                });
            }
            await tx.loanRepayment.create({
                data: {
                    loanReference,
                    memberId,
                    memberName,
                    amount: totalAmount,
                    principalAmount: creditToPrincipal,
                    serviceFeeAmount: serviceFee,
                    overpaymentAmount,
                    paymentMethod: paymentMethod,
                    referenceNumber: referenceNumber || null,
                    status,
                },
            });
            this.logger.log(`LoanRepayment created [status: ${status}] for loan ${loanReference}. ` +
                `Principal: ${creditToPrincipal}, ServiceFee: ${serviceFee}, Overpayment: ${overpaymentAmount}`);
        });
        try {
            this.lasClient.emit('repayment.posted', {
                loanReference,
                memberId,
                totalAmount,
                principal,
                serviceFee,
                overpaymentAmount,
                status,
            });
            this.logger.log(`Emitted repayment.posted for loan ${loanReference}`);
        }
        catch (error) {
            this.logger.error(`Failed to emit repayment.posted: ${error.message}`);
        }
    }
};
exports.RepaymentsService = RepaymentsService;
exports.RepaymentsService = RepaymentsService = RepaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('LAS_CLIENT')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        microservices_1.ClientProxy])
], RepaymentsService);
//# sourceMappingURL=repayments.service.js.map