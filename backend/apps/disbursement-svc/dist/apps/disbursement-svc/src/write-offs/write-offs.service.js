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
var WriteOffsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteOffsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const microservices_1 = require("@nestjs/microservices");
const LOAN_FUND_CODE = 'LOAN_BDOEA';
const LOAN_FUND_FALLBACK = 'LN';
let WriteOffsService = WriteOffsService_1 = class WriteOffsService {
    constructor(prisma, lasClient) {
        this.prisma = prisma;
        this.lasClient = lasClient;
        this.logger = new common_1.Logger(WriteOffsService_1.name);
    }
    async findAll() {
        return this.prisma.loanWriteOff.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async createWriteOffRequest(data) {
        if (!data.loanReference || !data.amount || !data.reason) {
            throw new common_1.BadRequestException('Missing required fields for write-off request');
        }
        const existing = await this.prisma.loanWriteOff.findUnique({
            where: { loanReference: data.loanReference },
        });
        if (existing) {
            throw new common_1.BadRequestException(`A write-off request for loan ${data.loanReference} already exists`);
        }
        const request = await this.prisma.loanWriteOff.create({
            data: {
                loanReference: data.loanReference,
                memberId: data.memberId,
                memberName: data.memberName,
                amount: data.amount,
                reason: data.reason,
                requestedBy: data.requestedBy,
                status: 'PENDING',
            },
        });
        this.logger.log(`Created PENDING write-off request for loan ${data.loanReference}`);
        return request;
    }
    async approveOrRejectWriteOff(loanReference, decision, authorizedBy) {
        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            throw new common_1.BadRequestException(`Invalid decision: ${decision}`);
        }
        const writeOff = await this.prisma.loanWriteOff.findUnique({
            where: { loanReference },
        });
        if (!writeOff) {
            throw new common_1.NotFoundException(`Write-off request for loan ${loanReference} not found`);
        }
        if (writeOff.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Write-off request is already processed (current status: ${writeOff.status})`);
        }
        await this.prisma.$transaction(async (tx) => {
            if (decision === 'APPROVED') {
                let loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_CODE } });
                if (!loanFund)
                    loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_FALLBACK } });
                if (!loanFund)
                    throw new Error(`Loan fund not found for write-off`);
                await tx.fund.update({
                    where: { id: loanFund.id },
                    data: { balance: { decrement: writeOff.amount } },
                });
                await tx.fundTransaction.create({
                    data: {
                        fundId: loanFund.id,
                        amount: -writeOff.amount,
                        type: 'WITHDRAWAL',
                        description: `Loan write-off for ${writeOff.memberName} (ref: ${writeOff.loanReference}) - ${writeOff.reason}`,
                        referenceId: writeOff.loanReference,
                    },
                });
            }
            await tx.loanWriteOff.update({
                where: { id: writeOff.id },
                data: {
                    status: decision,
                    authorizedBy,
                },
            });
            this.logger.log(`Write-off for loan ${loanReference} resolved as ${decision}`);
        });
        if (decision === 'APPROVED') {
            try {
                this.lasClient.emit('writeoff.approved', {
                    loanReference: writeOff.loanReference,
                    memberId: writeOff.memberId,
                    amount: writeOff.amount,
                    authorizedBy,
                    resolvedAt: new Date().toISOString(),
                });
                this.logger.log(`Emitted writeoff.approved for ${writeOff.loanReference}`);
            }
            catch (error) {
                this.logger.error(`Failed to emit writeoff.approved: ${error.message}`);
            }
        }
        return { success: true, loanReference, decision };
    }
};
exports.WriteOffsService = WriteOffsService;
exports.WriteOffsService = WriteOffsService = WriteOffsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('LAS_CLIENT')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        microservices_1.ClientProxy])
], WriteOffsService);
//# sourceMappingURL=write-offs.service.js.map