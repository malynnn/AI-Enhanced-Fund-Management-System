import { PrismaClient } from './node_modules/.prisma/client/index.js';

async function test() {
  const prisma = new PrismaClient();
  try {
    const fundsRaw = await prisma.fund.findMany({
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

    const ledgerRaw = await prisma.fundTransaction.findMany({
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

    const pendingDisbursements = await prisma.disbursementRequest.findMany({
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
    const duesAggr = await prisma.duesRecord.aggregate({
      where: { month: currentMonth, status: 'CONFIRMED' },
      _sum: { amountPaid: true }
    });
    const collectedThisMonth = Number(duesAggr._sum.amountPaid || 0);
    const targetThisMonth = 450000;
    const collectionRate = targetThisMonth > 0 ? ((collectedThisMonth / targetThisMonth) * 100).toFixed(1) : 0;
    
    const unpaidMembers = await prisma.duesRecord.count({
      where: { month: currentMonth, status: 'PENDING' }
    });

    const duesOverview = {
      collectedThisMonth,
      targetThisMonth,
      collectionRate: Number(collectionRate),
      unpaidMembers: unpaidMembers || 24 
    };

    const activeLoansCount = await prisma.disbursementRequest.count({
      where: { status: 'COMPLETED', fundId: 'LN' }
    });
    
    const loansAggr = await prisma.disbursementRequest.aggregate({
      where: { status: 'COMPLETED', fundId: 'LN' },
      _sum: { amount: true }
    });
    
    const totalReceivables = Number(loansAggr._sum.amount || 0);
    
    const pendingLoansCount = await prisma.disbursementRequest.count({
      where: { status: 'PENDING', fundId: 'LN' }
    });

    const loansOverview = {
      activeLoans: activeLoansCount,
      totalReceivables,
      pendingApplications: pendingLoansCount
    };

    const result = {
      funds,
      ledger,
      incomingWebhookQueue,
      duesOverview,
      loansOverview
    };

    console.log(JSON.stringify(result, null, 2));
  } catch(err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
