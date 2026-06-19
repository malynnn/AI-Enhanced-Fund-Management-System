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
var DuesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const events_1 = require("@backend/events");
const microservices_1 = require("@nestjs/microservices");
let DuesService = DuesService_1 = class DuesService {
    constructor(prisma, ledgerClient, repaymentsClient) {
        this.prisma = prisma;
        this.ledgerClient = ledgerClient;
        this.repaymentsClient = repaymentsClient;
        this.logger = new common_1.Logger(DuesService_1.name);
    }
    async processDuesEvent(data) {
        if (!data.transactionId || !data.memberId || !data.amount || !data.fundCredited) {
            throw new Error('Missing required fields: transactionId, memberId, amount, or fundCredited');
        }
        const existing = await this.prisma.duesRecord.findUnique({
            where: { transactionId: data.transactionId },
        });
        if (existing) {
            this.logger.log(`Duplicate transactionId ${data.transactionId} ignored.`);
            return;
        }
        const fund = await this.prisma.fund.findUnique({
            where: { code: data.fundCredited },
        });
        if (!fund) {
            throw new Error(`Fund with code ${data.fundCredited} does not exist`);
        }
        await this.prisma.duesRecord.create({
            data: {
                transactionId: data.transactionId,
                memberId: data.memberId,
                name: data.fullName || 'Unknown',
                month: data.monthCovered || 'Unknown',
                amountPaid: Number(data.amount),
                method: (data.paymentMethod || 'SALARY_DEDUCTION'),
                referenceNumber: data.referenceNumber,
                fundToCredit: fund.code,
                status: 'PENDING',
            },
        });
        this.logger.log(`Successfully saved DuesRecord for transaction ${data.transactionId}`);
    }
    async findAll(status) {
        const whereClause = status ? { status: status } : {};
        return this.prisma.duesRecord.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });
    }
    async confirmDues(id) {
        const record = await this.prisma.duesRecord.findUnique({ where: { id } });
        if (!record) {
            throw new common_1.NotFoundException(`Dues record ${id} not found`);
        }
        if (record.status === 'CONFIRMED') {
            throw new common_1.ConflictException('Dues record is already Confirmed');
        }
        const updated = await this.prisma.duesRecord.update({
            where: { id },
            data: { status: 'CONFIRMED' },
        });
        try {
            this.ledgerClient.emit('fund.dues.posted', {
                duesRecordId: updated.id,
                transactionId: updated.transactionId,
                amount: updated.amountPaid,
                fundCode: updated.fundToCredit,
                memberId: updated.memberId,
                memberName: updated.name,
            });
            this.logger.log(`Emitted fund.dues.posted for record ${id}`);
        }
        catch (error) {
            this.logger.error(`Failed to emit fund.dues.posted event for ${id}: ${error.message}`);
        }
        if (updated.collectionType === 'LOAN_PAYMENT') {
            try {
                const activeLoan = await this.prisma.disbursementRequest.findFirst({
                    where: {
                        memberId: updated.memberId,
                        status: 'COMPLETED',
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                });
                if (activeLoan) {
                    const repaymentEvent = {
                        loanReference: activeLoan.loanReference,
                        memberId: updated.memberId,
                        memberName: updated.name,
                        amount: Number(updated.amountPaid),
                        principalAmount: Number(updated.amountPaid),
                        serviceFeeAmount: 0,
                        paymentMethod: updated.method,
                        referenceNumber: updated.referenceNumber || undefined,
                    };
                    this.repaymentsClient.emit(events_1.QUEUE_REPAYMENTS, repaymentEvent);
                    this.logger.log(`Emitted ${events_1.QUEUE_REPAYMENTS} event for loan ${activeLoan.loanReference} from collection confirmation`);
                }
                else {
                    this.logger.warn(`No active completed loan found for member ${updated.memberId} when confirming collection.`);
                }
            }
            catch (error) {
                this.logger.error(`Failed to emit ${events_1.QUEUE_REPAYMENTS} event: ${error.message}`);
            }
        }
        return updated;
    }
    async createCollection(payload) {
        const { memberId, memberName, collectionType, amount, method, referenceNumber, reference_number, depositFund, } = payload;
        if (!memberId || !memberName || !collectionType || amount === undefined || !method) {
            throw new common_1.BadRequestException('Missing required fields: memberId, memberName, collectionType, amount, method');
        }
        const sanitizedMemberId = memberId.toUpperCase().trim();
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            throw new common_1.BadRequestException('Amount must be a positive number');
        }
        if (!['DUES', 'LOAN_PAYMENT', 'CONTRIBUTION'].includes(collectionType)) {
            throw new common_1.BadRequestException(`Invalid collectionType: ${collectionType}`);
        }
        const fundCodeMap = {
            GENERAL_FUND: 'GF',
            UNION_FUND: 'UF',
            LOAN_FUND: 'LN',
            FOREIGN_FUND: 'FA',
            DEATH_ASSISTANCE_FUND: 'DA',
            EMERGENCY_FUND: 'GF',
        };
        const targetFundCode = fundCodeMap[depositFund] || 'GF';
        const fund = await this.prisma.fund.findUnique({
            where: { code: targetFundCode },
        });
        if (!fund) {
            throw new common_1.BadRequestException(`Target fund with code ${targetFundCode} does not exist`);
        }
        const refNo = referenceNumber || reference_number || null;
        const txId = `TXN-COL-${Math.floor(100000 + Math.random() * 900000)}`;
        const now = new Date();
        const currentMonth = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
        return this.prisma.$transaction(async (tx) => {
            if (collectionType === 'LOAN_PAYMENT') {
                const activeLoan = await tx.disbursementRequest.findFirst({
                    where: {
                        memberId: sanitizedMemberId,
                        status: 'COMPLETED',
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                });
                if (!activeLoan) {
                    throw new common_1.BadRequestException(`No active completed loan found for member ${sanitizedMemberId}`);
                }
                const currentLoanBalance = Number(activeLoan.amount);
                const newLoanBalance = Math.max(0, currentLoanBalance - numericAmount);
                await tx.disbursementRequest.update({
                    where: { id: activeLoan.id },
                    data: { amount: newLoanBalance },
                });
                this.logger.log(`Subtracted ${numericAmount} from outstanding loan balance of member ${sanitizedMemberId} (ref: ${activeLoan.loanReference}). New balance: ${newLoanBalance}`);
            }
            const record = await tx.duesRecord.create({
                data: {
                    transactionId: txId,
                    memberId: sanitizedMemberId,
                    name: memberName,
                    month: currentMonth,
                    amountPaid: numericAmount,
                    method: method,
                    referenceNumber: refNo,
                    fundToCredit: targetFundCode,
                    status: 'PENDING',
                    collectionType: collectionType,
                },
            });
            this.logger.log(`Created collection record ${record.id} with type ${collectionType}`);
            return record;
        });
    }
};
exports.DuesService = DuesService;
exports.DuesService = DuesService = DuesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('LEDGER_CLIENT')),
    __param(2, (0, common_1.Inject)('REPAYMENTS_CLIENT')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        microservices_1.ClientProxy,
        microservices_1.ClientProxy])
], DuesService);
//# sourceMappingURL=dues.service.js.map