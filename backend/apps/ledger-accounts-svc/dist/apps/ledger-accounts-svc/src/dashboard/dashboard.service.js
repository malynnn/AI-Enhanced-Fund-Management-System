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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardData() {
        const fundsRaw = await this.prisma.fund.findMany({
            include: {
                _count: {
                    select: { transactions: true }
                }
            }
        });
        const fundOrder = ['GF', 'UF', 'LN', 'FA', 'DA'];
        const funds = fundsRaw.map(f => ({
            id: f.code,
            name: f.name,
            balance: Number(f.balance),
            txCount: f._count.transactions
        })).sort((a, b) => {
            const idxA = fundOrder.indexOf(a.id);
            const idxB = fundOrder.indexOf(b.id);
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });
        const ledgerRaw = await this.prisma.fundTransaction.findMany({
            take: 20,
            orderBy: { timestamp: 'desc' },
            where: {
                amount: { gt: 0.1 }
            }
        });
        const ledger = ledgerRaw.map((tx, idx) => ({
            id: tx.id,
            fundId: tx.fundId,
            date: tx.timestamp.toISOString().split('T')[0],
            desc: tx.description,
            type: tx.type === 'DEPOSIT' || tx.type === 'CORRECTING_ENTRY' ? 'Credit' : 'Debit',
            amount: Number(tx.amount),
            ref: tx.referenceId
        }));
        const pendingDisbursements = await this.prisma.disbursementRequest.findMany({
            where: { status: 'PENDING' }
        });
        const incomingWebhookQueue = pendingDisbursements.map(d => ({
            disbursement_txn_id: d.id,
            loan_ref: d.loanReference,
            member_id: d.memberId,
            member_name: d.memberName,
            amount: Number(d.amount),
            date: d.createdAt.toISOString().split('T')[0],
            payment_method: d.paymentMethod,
            fund_to_debit: d.fundId === 'LN' ? 'Loans' : d.fundId,
            fund_id: d.fundId,
            authorised_by: d.authorizedBy || 'SYSTEM'
        }));
        const now = new Date();
        const currentMonth = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
        const duesAggr = await this.prisma.duesRecord.aggregate({
            where: { month: currentMonth, status: 'CONFIRMED' },
            _sum: { amountPaid: true }
        });
        const collectedThisMonth = Number(duesAggr._sum.amountPaid || 0);
        const targetThisMonth = 450000;
        const collectionRate = targetThisMonth > 0 ? ((collectedThisMonth / targetThisMonth) * 100).toFixed(1) : 0;
        const unpaidMembers = await this.prisma.duesRecord.count({
            where: { month: currentMonth, status: 'PENDING' }
        });
        const duesOverview = {
            collectedThisMonth,
            targetThisMonth,
            collectionRate: Number(collectionRate),
            unpaidMembers: unpaidMembers || 24
        };
        const activeLoansCount = await this.prisma.disbursementRequest.count({
            where: { status: 'COMPLETED', fundId: 'LN' }
        });
        const loansAggr = await this.prisma.disbursementRequest.aggregate({
            where: { status: 'COMPLETED', fundId: 'LN' },
            _sum: { amount: true }
        });
        const totalReceivables = Number(loansAggr._sum.amount || 0);
        const pendingLoansCount = await this.prisma.disbursementRequest.count({
            where: { status: 'PENDING', fundId: 'LN' }
        });
        const loansOverview = {
            activeLoans: activeLoansCount,
            totalReceivables,
            pendingApplications: pendingLoansCount
        };
        return {
            funds,
            ledger,
            incomingWebhookQueue,
            duesOverview,
            loansOverview
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map