const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:capstone@localhost:5432/finance_db?schema=public' }
  }
});

async function main() {
  console.log('Seeding Database...');

  // 1. Create Funds
  const gf = await prisma.fund.upsert({
    where: { code: 'GF' },
    update: { balance: 250000.00 },
    create: { code: 'GF', name: 'General Fund', balance: 250000.00 }
  });
  
  const lcf = await prisma.fund.upsert({
    where: { code: 'LCF' },
    update: { balance: 500000.00 },
    create: { code: 'LCF', name: 'Loan Capital Fund', balance: 500000.00 }
  });

  // 2. Chart of Accounts
  const accounts = [
    { code: 'A-100', name: 'Cash in Bank', type: 'Asset', fund: 'General Fund' },
    { code: 'E-401', name: 'Office Supplies', type: 'Expense', fund: 'General Fund' },
    { code: 'E-402', name: 'Meeting Meals', type: 'Expense', fund: 'General Fund' },
  ];
  for (const acc of accounts) {
    await prisma.chartOfAccount.upsert({
      where: { code: acc.code },
      update: acc,
      create: acc
    });
  }

  // 3. Budgets
  const budgets = [
    { accountCode: 'E-401', accountName: 'Office Supplies', approvedAmount: 50000, fiscalYear: 2026 },
    { accountCode: 'E-402', accountName: 'Meeting Meals', approvedAmount: 30000, fiscalYear: 2026 },
  ];
  for (const b of budgets) {
    await prisma.budgetCategory.upsert({
      where: { accountCode: b.accountCode },
      update: b,
      create: b
    });
  }

  // 4. Dues Records (Confirmed & Pending)
  await prisma.duesRecord.createMany({
    data: [
      { transactionId: 'TXN-SIM-001', memberId: 'M-101', name: 'Dela Cruz, Juan', month: 'May 2026', amountPaid: 500, method: 'Salary Deduction', fundToCredit: 'GF', status: 'Confirmed' },
      { transactionId: 'TXN-SIM-002', memberId: 'M-102', name: 'Santos, Maria', month: 'May 2026', amountPaid: 500, method: 'Over-the-Counter', fundToCredit: 'GF', status: 'Pending' },
      { transactionId: 'TXN-SIM-003', memberId: 'M-103', name: 'Reyes, Carlos', month: 'May 2026', amountPaid: 450, method: 'Salary Deduction', fundToCredit: 'GF', status: 'Pending' }, // Discrepancy test
    ],
    skipDuplicates: true
  });

  // 5. Disbursements
  await prisma.disbursementRequest.createMany({
    data: [
      { loanReference: 'LN-2026-001', memberId: 'M-101', memberName: 'Dela Cruz, Juan', amount: 15000, paymentMethod: 'BANK_TRANSFER', bankAccount: 'BDO-12345', status: 'PENDING', fundId: lcf.id },
      { loanReference: 'LN-2026-002', memberId: 'M-102', memberName: 'Santos, Maria', amount: 30000, paymentMethod: 'CHECK', bankAccount: '', status: 'COMPLETED', authorizedBy: 'Admin', fundId: lcf.id }
    ],
    skipDuplicates: true
  });

  // 6. Expense Vouchers
  await prisma.expenseVoucher.createMany({
    data: [
      { voucherNumber: 'EV-2026-001', date: new Date(), payee: 'National Bookstore', purpose: 'Bond paper & inks', amount: 2500, accountCode: 'E-401', status: 'PENDING' },
      { voucherNumber: 'EV-2026-002', date: new Date(), payee: 'Jollibee', purpose: 'Board meeting lunch', amount: 1200, accountCode: 'E-402', status: 'POSTED', postedAt: new Date() }
    ],
    skipDuplicates: true
  });

  // 7. Petty Cash (Initial Balance)
  await prisma.pettyCashTransaction.create({
    data: {
      type: 'OPENING_BALANCE',
      amount: 10000,
      description: 'Initial petty cash fund',
      runningBalance: 10000
    }
  });

  console.log('✅ Mock Data successfully seeded!');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
