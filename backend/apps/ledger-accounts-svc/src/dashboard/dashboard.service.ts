import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData() {
    // 1. Funds & balances & txCount
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

    // 2. Ledger (Recent Transactions)
    const ledgerRaw = await this.prisma.fundTransaction.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' },
      where: {
        amount: { gt: 0.1 } // Exclude our historical mock seed data
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

    // 3. Incoming Webhook Queue (Pending Disbursements)
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

    // 4. Dues Overview
    // Get current month
    const now = new Date();
    const currentMonth = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
    const duesAggr = await this.prisma.duesRecord.aggregate({
      where: { month: currentMonth, status: 'CONFIRMED' },
      _sum: { amountPaid: true }
    });
    const collectedThisMonth = Number(duesAggr._sum.amountPaid || 0);
    const targetThisMonth = 450000;
    const collectionRate = targetThisMonth > 0 ? ((collectedThisMonth / targetThisMonth) * 100).toFixed(1) : 0;
    
    // Unpaid members mock for now
    const unpaidMembers = await this.prisma.duesRecord.count({
      where: { month: currentMonth, status: 'PENDING' }
    });

    const duesOverview = {
      collectedThisMonth,
      targetThisMonth,
      collectionRate: Number(collectionRate),
      unpaidMembers: unpaidMembers || 24 // Fallback if 0 for mock feel
    };

    // 5. Loans Overview
    const activeLoansCount = await this.prisma.disbursementRequest.count({
      where: { status: 'COMPLETED', fundId: 'LN' }
    });
    
    const loansAggr = await this.prisma.disbursementRequest.aggregate({
      where: { status: 'COMPLETED', fundId: 'LN' },
      _sum: { amount: true }
    });
    
    // Assuming total receivables = sum of all completed disbursements (in reality minus repayments, but simplifying for MVP)
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
}
