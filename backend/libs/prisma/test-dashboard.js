const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Testing funds...");
    const fundsRaw = await prisma.fund.findMany({
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });
    console.log("Funds:", fundsRaw.length);

    console.log("Testing ledger...");
    const ledgerRaw = await prisma.fundTransaction.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' },
      where: {
        amount: { gt: 0.1 }
      }
    });
    console.log("Ledger:", ledgerRaw.length);

    console.log("Testing webhooks...");
    const pendingDisbursements = await prisma.disbursementRequest.findMany({
      where: { status: 'PENDING' }
    });
    console.log("Pending:", pendingDisbursements.length);

    console.log("Testing dues...");
    const now = new Date();
    const currentMonth = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
    const duesAggr = await prisma.duesRecord.aggregate({
      where: { month: currentMonth, status: 'CONFIRMED' },
      _sum: { amountPaid: true }
    });
    console.log("Dues Aggr:", duesAggr);

    console.log("Testing loans...");
    const loansAggr = await prisma.disbursementRequest.aggregate({
      where: { status: 'COMPLETED', fundId: 'LN' },
      _sum: { amount: true }
    });
    console.log("Loans Aggr:", loansAggr);

  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
