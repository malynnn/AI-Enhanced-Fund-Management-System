const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL || 'postgresql://postgres:capstone@localhost:5432/finance_db?schema=public' }
  }
});

async function main() {
  console.log('Wiping Database...');
  await prisma.fSAuditLog.deleteMany();
  await prisma.reportSignoff.deleteMany();
  await prisma.fundTransaction.deleteMany();
  await prisma.disbursementRequest.deleteMany();
  await prisma.loanRepayment.deleteMany();
  await prisma.loanWriteOff.deleteMany();
  await prisma.duesRecord.deleteMany();
  await prisma.pettyCashTransaction.deleteMany();
  await prisma.expenseVoucher.deleteMany();
  await prisma.budgetCategory.deleteMany();
  await prisma.chartOfAccount.deleteMany();
  await prisma.fund.deleteMany();

  console.log('Seeding Database...');

  // 1. Funds
  const funds = [
    { id: 'GF', code: 'GF', name: 'General Fund', balance: 1812350 },
    { id: 'UF', code: 'UF', name: 'Union Fund', balance: 4520900 },
    { id: 'LN', code: 'LN', name: 'Loans', balance: 1468000 },
    { id: 'FA', code: 'FA', name: 'Foreign Assistance', balance: 2500000 },
    { id: 'DA', code: 'DA', name: 'Death Assistance', balance: 850000 },
  ];
  await prisma.fund.createMany({ data: funds });

  // 2. Fund Transactions (Ledger)
  const transactions = [
    { fundId: 'GF', timestamp: new Date('2026-04-22'), description: 'Member Dues Batch Remittance', type: 'DEPOSIT', amount: 15000, referenceId: 'REF-8812' },
    { fundId: 'LN', timestamp: new Date('2026-04-26'), description: 'Disbursement: VINLUAN, VEN', type: 'WITHDRAWAL', amount: 30000, referenceId: 'LN-2026-071' },
    { fundId: 'GF', timestamp: new Date('2026-04-20'), description: 'Office Supplies Vendor Payment', type: 'WITHDRAWAL', amount: 4500, referenceId: 'REF-8809' },
    { fundId: 'UF', timestamp: new Date('2026-04-18'), description: 'Union Assembly Expense', type: 'WITHDRAWAL', amount: 12000, referenceId: 'UN-2026-004' },
    { fundId: 'FA', timestamp: new Date('2026-04-15'), description: 'Foreign Grant Received', type: 'DEPOSIT', amount: 500000, referenceId: 'FG-8801' },
    { fundId: 'DA', timestamp: new Date('2026-04-10'), description: 'Death Claim Benefit Release', type: 'WITHDRAWAL', amount: 20000, referenceId: 'DC-2026-012' },
  ];
  // Seed extra transactions to match frontend txCount
  const mockTxCounts = { GF: 248, UF: 112, LN: 45, FA: 30, DA: 20 };
  for (const f of funds) {
    const existingCount = transactions.filter(t => t.fundId === f.id).length;
    for (let i = 0; i < mockTxCounts[f.id] - existingCount; i++) {
      transactions.push({
        fundId: f.id,
        timestamp: new Date(`2026-01-01T00:00:00.000Z`),
        description: `Historical Tx ${i}`,
        type: 'DEPOSIT',
        amount: 0.01,
        referenceId: `HIST-${f.id}-${i}`
      });
    }
  }
  await prisma.fundTransaction.createMany({ data: transactions });

  // 3. Pending LAS Disbursements (Webhooks)
  await prisma.disbursementRequest.create({
    data: {
      loanReference: 'LN-2026-088',
      memberId: 'M-2023-112',
      memberName: 'DELA CRUZ, JUAN',
      amount: 50000,
      paymentMethod: 'BANK_TRANSFER',
      bankAccount: 'N/A',
      status: 'PENDING',
      authorizedBy: 'LAS_SYSTEM_AUTO',
      fundId: 'LN',
      createdAt: new Date('2026-05-11')
    }
  });

  // 4. Completed Disbursements (To match 42 active loans and 1,250,000 receivables)
  const activeLoans = [];
  const totalReceivablesTarget = 1250000;
  const targetPerLoan = Math.floor(totalReceivablesTarget / 42);
  for (let i = 0; i < 42; i++) {
    activeLoans.push({
      loanReference: `LN-ACTIVE-${i}`,
      memberId: `M-ACT-${i}`,
      memberName: `Active Borrower ${i}`,
      amount: (i === 41) ? (totalReceivablesTarget - (targetPerLoan * 41)) : targetPerLoan,
      paymentMethod: 'BANK_TRANSFER',
      bankAccount: 'N/A',
      status: 'COMPLETED',
      authorizedBy: 'Admin',
      fundId: 'LN',
    });
  }
  await prisma.disbursementRequest.createMany({ data: activeLoans });

  // 5. Dues Overview (Collected this month = 385000)
  const now = new Date();
  const currentMonth = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
  await prisma.duesRecord.create({
    data: {
      transactionId: 'TXN-DUES-MONTHLY',
      memberId: 'BATCH',
      name: 'Monthly Dues Remittance',
      month: currentMonth,
      amountPaid: 385000,
      method: 'SALARY_DEDUCTION',
      fundToCredit: 'GF',
      status: 'CONFIRMED'
    }
  });

  // 6. Chart of Accounts (Basic accounts needed)
  const accounts = [
    { code: 'A-100', name: 'Cash in Bank', type: 'Asset', fund: 'General Fund', status: 'Active' },
    { code: 'E-401', name: 'Office Supplies', type: 'Expense', fund: 'General Fund', status: 'Active' },
  ];
  await prisma.chartOfAccount.createMany({ data: accounts });

  console.log('✅ Dashboard Mock Data successfully seeded!');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
