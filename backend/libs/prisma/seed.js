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
  await prisma.fund.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding Database...');

  // 0. Users (System accounts & Mock Members)
  const mockMembers = [
    { id: "M-2023-112", name: "DELA CRUZ, JUAN" },
    { id: "M-2026-999", name: "VINLUAN, VEN" },
    { id: "M-2020-028", name: "CRUZ, PATRICIA M." },
    { id: "M-2021-055", name: "BAUTISTA, HENRY N." },
    { id: "M-2022-041", name: "FLORES, ANA GRACE" },
    { id: "M-2023-088", name: "CASTILLO, JORGE R." },
    { id: "M-2024-012", name: "AQUINO, CECILIA V." },
    { id: "M-2021-066", name: "NAVARRO, DENNIS L." },
    { id: "M-2018-099", name: "RAMIREZ, DANTE G." },
    { id: "M-2019-044", name: "SANTIAGO, ELENA M." },
    { id: "M-2020-008", name: "DOMINGO, FELIPE K." },
    { id: "M-2022-045", name: "SANTOS, MARIA LUZ" },
    { id: "M-2024-078", name: "REYES, ARMANDO P." },
    { id: "M-2021-033", name: "GARCIA, LORNA S." },
    { id: "M-2023-099", name: "MENDOZA, ROBERTO C." },
    { id: "M-2020-011", name: "TORRES, ELENA F." },
    { id: "M-2022-067", name: "VILLANUEVA, MARK J." },
    { id: "M-2023-031", name: "SORIANO, MARK T." },
    { id: "M-2022-019", name: "PADILLA, ROSE ANN" }
  ];

  const usersToSeed = [
    { id: 'u-admin-001', email: 'admin', password: 'password', role: 'ADMIN' },
    { id: 'u-treasurer-001', email: 'treasurer', password: 'password', role: 'TREASURER' },
    { id: 'u-president-001', email: 'president', password: 'password', role: 'PRESIDENT' },
    { id: 'u-auditor-001', email: 'auditor', password: 'password', role: 'USER' },
    ...mockMembers.map(m => ({
      id: m.id,
      email: m.id,
      password: 'password',
      role: 'USER'
    }))
  ];
  await prisma.user.createMany({ data: usersToSeed });
  console.log(`✅ Seeded ${usersToSeed.length} users.`);

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
    // General Fund
    { fundId: 'GF', timestamp: new Date('2026-04-20'), description: 'Office Supplies Vendor Payment', type: 'WITHDRAWAL', amount: 4500, referenceId: 'REF-8809' },
    { fundId: 'GF', timestamp: new Date('2026-04-22'), description: 'Member Dues Batch Remittance', type: 'DEPOSIT', amount: 15000, referenceId: 'REF-8812' },
    
    // Union Fund
    { fundId: 'UF', timestamp: new Date('2026-04-18'), description: 'Union Assembly Expense', type: 'WITHDRAWAL', amount: 12000, referenceId: 'UN-2026-004' },
    
    // Foreign Assistance & Death Assistance
    { fundId: 'FA', timestamp: new Date('2026-04-15'), description: 'Foreign Grant Received', type: 'DEPOSIT', amount: 500000, referenceId: 'FG-8801' },
    { fundId: 'DA', timestamp: new Date('2026-04-10'), description: 'Death Claim Benefit Release', type: 'WITHDRAWAL', amount: 20000, referenceId: 'DC-2026-012' },

    // Loans Fund - Disbursements (Withdrawals)
    { fundId: 'LN', timestamp: new Date('2026-01-15'), description: 'Disbursement: RAMIREZ, DANTE G.', type: 'WITHDRAWAL', amount: 25000, referenceId: 'LN-2026-080' },
    { fundId: 'LN', timestamp: new Date('2026-02-10'), description: 'Disbursement: SANTIAGO, ELENA M.', type: 'WITHDRAWAL', amount: 12000, referenceId: 'LN-2026-083' },
    { fundId: 'LN', timestamp: new Date('2026-03-05'), description: 'Disbursement: DOMINGO, FELIPE K.', type: 'WITHDRAWAL', amount: 8000, referenceId: 'LN-2026-084' },
    { fundId: 'LN', timestamp: new Date('2026-04-01'), description: 'Disbursement: VINLUAN, VEN', type: 'WITHDRAWAL', amount: 50000, referenceId: 'LN-2026-095' },
    { fundId: 'LN', timestamp: new Date('2026-04-26'), description: 'Disbursement: DELA CRUZ, JUAN', type: 'WITHDRAWAL', amount: 30000, referenceId: 'LN-2026-071' },
    { fundId: 'LN', timestamp: new Date('2026-05-03'), description: 'Disbursement: CRUZ, PATRICIA M.', type: 'WITHDRAWAL', amount: 25000, referenceId: 'LN-2026-072' },
    { fundId: 'LN', timestamp: new Date('2026-05-10'), description: 'Disbursement: BAUTISTA, HENRY N.', type: 'WITHDRAWAL', amount: 80000, referenceId: 'LN-2026-073' },
    { fundId: 'LN', timestamp: new Date('2026-05-15'), description: 'Disbursement: FLORES, ANA GRACE', type: 'WITHDRAWAL', amount: 15000, referenceId: 'LN-2026-074' },
    { fundId: 'LN', timestamp: new Date('2026-05-20'), description: 'Disbursement: CASTILLO, JORGE R.', type: 'WITHDRAWAL', amount: 50000, referenceId: 'LN-2026-075' },
    { fundId: 'LN', timestamp: new Date('2026-05-28'), description: 'Disbursement: AQUINO, CECILIA V.', type: 'WITHDRAWAL', amount: 35000, referenceId: 'LN-2026-076' },
    { fundId: 'LN', timestamp: new Date('2026-06-02'), description: 'Disbursement: NAVARRO, DENNIS L.', type: 'WITHDRAWAL', amount: 120000, referenceId: 'LN-2026-077' },

    // Loans Fund - Repayments (Deposits)
    { fundId: 'LN', timestamp: new Date('2026-05-01'), description: 'Repayment: VINLUAN, VEN', type: 'DEPOSIT', amount: 5500, referenceId: 'LN-2026-095' },
    { fundId: 'LN', timestamp: new Date('2026-05-05'), description: 'Repayment: DELA CRUZ, JUAN', type: 'DEPOSIT', amount: 5500, referenceId: 'LN-2026-071' },
    { fundId: 'LN', timestamp: new Date('2026-05-15'), description: 'Repayment: FLORES, ANA GRACE', type: 'DEPOSIT', amount: 2600, referenceId: 'LN-2026-074' },
    { fundId: 'LN', timestamp: new Date('2026-05-20'), description: 'Repayment: CRUZ, PATRICIA M.', type: 'DEPOSIT', amount: 3000, referenceId: 'LN-2026-072' },
    { fundId: 'LN', timestamp: new Date('2026-06-01'), description: 'Repayment: VINLUAN, VEN', type: 'DEPOSIT', amount: 5500, referenceId: 'LN-2026-095' },
    { fundId: 'LN', timestamp: new Date('2026-06-02'), description: 'Repayment: CASTILLO, JORGE R.', type: 'DEPOSIT', amount: 5550, referenceId: 'LN-2026-075' },
    { fundId: 'LN', timestamp: new Date('2026-06-05'), description: 'Repayment: DELA CRUZ, JUAN', type: 'DEPOSIT', amount: 5500, referenceId: 'LN-2026-071' },
    { fundId: 'LN', timestamp: new Date('2026-06-05'), description: 'Repayment: BAUTISTA, HENRY N.', type: 'DEPOSIT', amount: 8800, referenceId: 'LN-2026-073' },
    { fundId: 'LN', timestamp: new Date('2026-06-06'), description: 'Repayment: AQUINO, CECILIA V.', type: 'DEPOSIT', amount: 10500, referenceId: 'LN-2026-076' },
    { fundId: 'LN', timestamp: new Date('2026-06-10'), description: 'Repayment: NAVARRO, DENNIS L.', type: 'DEPOSIT', amount: 13200, referenceId: 'LN-2026-077' },
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

  // 3. Disbursement Requests — mixed statuses for a realistic queue
  const disbursements = [
    // PENDING — awaiting Treasurer authorization
    { loanReference: 'LN-2026-088', memberId: 'M-2023-112', memberName: 'DELA CRUZ, JUAN',       amount: 50000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0012-4453-12', status: 'PENDING',   authorizedBy: null,              fundId: 'LN', createdAt: new Date('2026-06-10') },
    { loanReference: 'LN-2026-089', memberId: 'M-2022-045', memberName: 'SANTOS, MARIA LUZ',      amount: 30000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0091-2234-88', status: 'PENDING',   authorizedBy: null,              fundId: 'LN', createdAt: new Date('2026-06-11') },
    { loanReference: 'LN-2026-090', memberId: 'M-2024-078', memberName: 'REYES, ARMANDO P.',       amount: 75000,  paymentMethod: 'CHECK',            bankAccount: 'CHECK-2026-001',   status: 'PENDING',   authorizedBy: null,              fundId: 'LN', createdAt: new Date('2026-06-12') },
    { loanReference: 'LN-2026-091', memberId: 'M-2021-033', memberName: 'GARCIA, LORNA S.',        amount: 20000,  paymentMethod: 'SALARY_DEDUCTION', bankAccount: 'N/A',              status: 'PENDING',   authorizedBy: null,              fundId: 'LN', createdAt: new Date('2026-06-13') },
    { loanReference: 'LN-2026-092', memberId: 'M-2023-099', memberName: 'MENDOZA, ROBERTO C.',     amount: 100000, paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0044-8812-09', status: 'PENDING',   authorizedBy: null,              fundId: 'LN', createdAt: new Date('2026-06-14') },
    // APPROVED — authorized, pending release
    { loanReference: 'LN-2026-081', memberId: 'M-2020-011', memberName: 'TORRES, ELENA F.',        amount: 45000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0033-6621-77', status: 'APPROVED',  authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-06-08') },
    { loanReference: 'LN-2026-082', memberId: 'M-2022-067', memberName: 'VILLANUEVA, MARK J.',     amount: 60000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0078-1190-33', status: 'APPROVED',  authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-06-09') },
    // COMPLETED — fully released
    { loanReference: 'LN-2026-071', memberId: 'M-2023-112', memberName: 'DELA CRUZ, JUAN',         amount: 30000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0011-3344-55', status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-04-26') },
    { loanReference: 'LN-2026-072', memberId: 'M-2020-028', memberName: 'CRUZ, PATRICIA M.',       amount: 25000,  paymentMethod: 'CASH',             bankAccount: 'CASH',             status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-05-03') },
    { loanReference: 'LN-2026-073', memberId: 'M-2021-055', memberName: 'BAUTISTA, HENRY N.',      amount: 80000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0055-7733-22', status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-05-10') },
    { loanReference: 'LN-2026-074', memberId: 'M-2022-041', memberName: 'FLORES, ANA GRACE',       amount: 15000,  paymentMethod: 'SALARY_DEDUCTION', bankAccount: 'N/A',              status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-05-15') },
    { loanReference: 'LN-2026-075', memberId: 'M-2023-088', memberName: 'CASTILLO, JORGE R.',      amount: 50000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0022-9981-44', status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-05-20') },
    { loanReference: 'LN-2026-076', memberId: 'M-2024-012', memberName: 'AQUINO, CECILIA V.',      amount: 35000,  paymentMethod: 'CHECK',            bankAccount: 'CHECK-2026-076',   status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-05-28') },
    { loanReference: 'LN-2026-077', memberId: 'M-2021-066', memberName: 'NAVARRO, DENNIS L.',      amount: 120000, paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0099-4455-11', status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-06-02') },
    { loanReference: 'LN-2026-080', memberId: 'M-2018-099', memberName: 'RAMIREZ, DANTE G.',       amount: 25000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0088-2233-11', status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-01-15') },
    { loanReference: 'LN-2026-083', memberId: 'M-2019-044', memberName: 'SANTIAGO, ELENA M.',      amount: 12000,  paymentMethod: 'CASH',             bankAccount: 'CASH',             status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-02-10') },
    { loanReference: 'LN-2026-084', memberId: 'M-2020-008', memberName: 'DOMINGO, FELIPE K.',      amount: 8000,   paymentMethod: 'CHECK',            bankAccount: 'CHECK-2026-084',   status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-03-05') },
    { loanReference: 'LN-2026-095', memberId: 'M-2026-999', memberName: 'VINLUAN, VEN',            amount: 50000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0099-3322-11', status: 'COMPLETED', authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-04-01') },
    // REJECTED
    { loanReference: 'LN-2026-085', memberId: 'M-2023-031', memberName: 'SORIANO, MARK T.',        amount: 200000, paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0011-2233-99', status: 'REJECTED',  authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-06-05') },
    { loanReference: 'LN-2026-086', memberId: 'M-2022-019', memberName: 'PADILLA, ROSE ANN',       amount: 90000,  paymentMethod: 'BANK_TRANSFER',    bankAccount: 'BDO-0077-5566-00', status: 'REJECTED',  authorizedBy: 'Treasurer Amante', fundId: 'LN', createdAt: new Date('2026-06-07') },
  ];
  await prisma.disbursementRequest.createMany({ data: disbursements });

  // 4. Loan Repayments — realistic repayment records
  const repayments = [
    { loanReference: 'LN-2026-095', memberId: 'M-2026-999', memberName: 'VINLUAN, VEN',            amount: 5500,  principalAmount: 5000,  serviceFeeAmount: 500,  overpaymentAmount: 0, paymentMethod: 'BANK_TRANSFER',    referenceNumber: 'BT-2026-0501', status: 'PROCESSED',           treasurerDecision: 'NONE', processedAt: new Date('2026-05-01') },
    { loanReference: 'LN-2026-071', memberId: 'M-2023-112', memberName: 'DELA CRUZ, JUAN',         amount: 5500,  principalAmount: 5000,  serviceFeeAmount: 500,  overpaymentAmount: 0, paymentMethod: 'SALARY_DEDUCTION', referenceNumber: 'SD-2026-0501', status: 'PROCESSED',           treasurerDecision: 'NONE', processedAt: new Date('2026-05-05') },
    { loanReference: 'LN-2026-074', memberId: 'M-2022-041', memberName: 'FLORES, ANA GRACE',       amount: 2600,  principalAmount: 2100,  serviceFeeAmount: 500,  overpaymentAmount: 0, paymentMethod: 'SALARY_DEDUCTION', referenceNumber: 'SD-2026-0415', status: 'PROCESSED',           treasurerDecision: 'NONE', processedAt: new Date('2026-05-15') },
    { loanReference: 'LN-2026-072', memberId: 'M-2020-028', memberName: 'CRUZ, PATRICIA M.',       amount: 3000,  principalAmount: 2750,  serviceFeeAmount: 250,  overpaymentAmount: 0, paymentMethod: 'BANK_TRANSFER',    referenceNumber: 'BT-0520-0041', status: 'PROCESSED',           treasurerDecision: 'NONE', processedAt: new Date('2026-05-20') },
    { loanReference: 'LN-2026-095', memberId: 'M-2026-999', memberName: 'VINLUAN, VEN',            amount: 5500,  principalAmount: 5000,  serviceFeeAmount: 500,  overpaymentAmount: 0, paymentMethod: 'BANK_TRANSFER',    referenceNumber: 'BT-2026-0601', status: 'PROCESSED',           treasurerDecision: 'NONE', processedAt: new Date('2026-06-01') },
    { loanReference: 'LN-2026-075', memberId: 'M-2023-088', memberName: 'CASTILLO, JORGE R.',      amount: 5550,  principalAmount: 5000,  serviceFeeAmount: 550,  overpaymentAmount: 0, paymentMethod: 'BANK_TRANSFER',    referenceNumber: 'BT-0620-0090', status: 'PROCESSED',           treasurerDecision: 'NONE', processedAt: new Date('2026-06-02') },
    { loanReference: 'LN-2026-071', memberId: 'M-2023-112', memberName: 'DELA CRUZ, JUAN',         amount: 5500,  principalAmount: 5000,  serviceFeeAmount: 500,  overpaymentAmount: 0, paymentMethod: 'SALARY_DEDUCTION', referenceNumber: 'SD-2026-0601', status: 'PROCESSED',           treasurerDecision: 'NONE', processedAt: new Date('2026-06-05') },
    { loanReference: 'LN-2026-073', memberId: 'M-2021-055', memberName: 'BAUTISTA, HENRY N.',      amount: 8800,  principalAmount: 8000,  serviceFeeAmount: 800,  overpaymentAmount: 0, paymentMethod: 'SALARY_DEDUCTION', referenceNumber: 'SD-2026-0551', status: 'PROCESSED',           treasurerDecision: 'NONE', processedAt: new Date('2026-06-05') },
    { loanReference: 'LN-2026-076', memberId: 'M-2024-012', memberName: 'AQUINO, CECILIA V.',      amount: 10500, principalAmount: 9100,  serviceFeeAmount: 900,  overpaymentAmount: 500, paymentMethod: 'BANK_TRANSFER',    referenceNumber: 'BT-0606-0112', status: 'OVERPAYMENT_PENDING', treasurerDecision: 'NONE', processedAt: new Date('2026-06-06') },
    { loanReference: 'LN-2026-077', memberId: 'M-2021-066', memberName: 'NAVARRO, DENNIS L.',      amount: 13200, principalAmount: 12000, serviceFeeAmount: 1200, overpaymentAmount: 0, paymentMethod: 'SALARY_DEDUCTION', referenceNumber: 'SD-2026-0610', status: 'PROCESSED',           treasurerDecision: 'NONE', processedAt: new Date('2026-06-10') },
  ];
  await prisma.loanRepayment.createMany({ data: repayments });
  console.log(`✅ Seeded ${disbursements.length} disbursements and ${repayments.length} repayments.`);

  // 5. Dues Overview & Individual Member Collections
  const now = new Date();
  const currentMonth = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
  const duesRecords = [
    {
      transactionId: 'TXN-DUES-MONTHLY',
      memberId: 'BATCH',
      name: 'Monthly Dues Remittance',
      month: currentMonth,
      amountPaid: 385000,
      method: 'SALARY_DEDUCTION',
      fundToCredit: 'GF',
      status: 'CONFIRMED'
    },
    {
      transactionId: 'TXN-DUES-001',
      memberId: 'M-2020-028',
      name: 'CRUZ, PATRICIA M.',
      month: currentMonth,
      amountPaid: 500,
      method: 'BANK_TRANSFER',
      referenceNumber: 'BT-0615-0901',
      fundToCredit: 'GF',
      status: 'CONFIRMED'
    },
    {
      transactionId: 'TXN-DUES-002',
      memberId: 'M-2023-112',
      name: 'DELA CRUZ, JUAN',
      month: currentMonth,
      amountPaid: 500,
      method: 'CASH',
      referenceNumber: 'CS-0615-0902',
      fundToCredit: 'LN',
      status: 'PENDING',
      collectionType: 'LOAN_PAYMENT'
    },
    {
      transactionId: 'TXN-DUES-003',
      memberId: 'M-2023-112',
      name: 'DELA CRUZ, JUAN',
      month: currentMonth,
      amountPaid: 450,
      method: 'SALARY_DEDUCTION',
      referenceNumber: 'SD-0615-0903',
      fundToCredit: 'UF',
      status: 'PENDING',
      collectionType: 'CONTRIBUTION'
    },
    {
      transactionId: 'TXN-DUES-004',
      memberId: 'M-2021-055',
      name: 'BAUTISTA, HENRY N.',
      month: currentMonth,
      amountPaid: 500,
      method: 'CHECK',
      referenceNumber: 'CK-0615-0904',
      fundToCredit: 'GF',
      status: 'PENDING'
    },
    {
      transactionId: 'TXN-DUES-005',
      memberId: 'M-2023-112',
      name: 'DELA CRUZ, JUAN',
      month: currentMonth,
      amountPaid: 600,
      method: 'BANK_TRANSFER',
      referenceNumber: 'BT-0615-0905',
      fundToCredit: 'GF',
      status: 'CONFIRMED'
    },
    {
      transactionId: 'TXN-DUES-006',
      memberId: 'M-2022-041',
      name: 'FLORES, ANA GRACE',
      month: 'May 2026',
      amountPaid: 500,
      method: 'BANK_TRANSFER',
      referenceNumber: 'BT-0515-0801',
      fundToCredit: 'GF',
      status: 'CONFIRMED'
    },
    {
      transactionId: 'TXN-DUES-007',
      memberId: 'M-2023-088',
      name: 'CASTILLO, JORGE R.',
      month: 'May 2026',
      amountPaid: 500,
      method: 'BANK_TRANSFER',
      referenceNumber: 'BT-0515-0802',
      fundToCredit: 'GF',
      status: 'CONFIRMED'
    },
    {
      transactionId: 'TXN-DUES-010',
      memberId: 'M-2026-999',
      name: 'VINLUAN, VEN',
      month: currentMonth,
      amountPaid: 500,
      method: 'BANK_TRANSFER',
      referenceNumber: 'BT-0615-0910',
      fundToCredit: 'GF',
      status: 'CONFIRMED'
    },
    {
      transactionId: 'TXN-DUES-011',
      memberId: 'M-2026-999',
      name: 'VINLUAN, VEN',
      month: 'May 2026',
      amountPaid: 500,
      method: 'BANK_TRANSFER',
      referenceNumber: 'BT-0515-0911',
      fundToCredit: 'GF',
      status: 'CONFIRMED'
    }
  ];
  for (const record of duesRecords) {
    await prisma.duesRecord.create({ data: record });
  }
  console.log(`✅ Seeded ${duesRecords.length} dues records.`);

  // 6. Chart of Accounts (DELETED)
  console.log('Skipping Chart of Accounts seeding...');

  // 7. Budget Categories (for Expenses & Petty Cash page)
  const budgetCategories = [
    // FY 2026 Budget (Scaled Up)
    { accountCode: 'E-401', accountName: 'Office Supplies',         approvedAmount: 150000, fiscalYear: 2026 },
    { accountCode: 'E-402', accountName: 'Travel & Transportation', approvedAmount: 80000,  fiscalYear: 2026 },
    { accountCode: 'E-403', accountName: 'Meals & Representation',  approvedAmount: 50000,  fiscalYear: 2026 },
    { accountCode: 'E-404', accountName: 'Communication Expenses',  approvedAmount: 40000,  fiscalYear: 2026 },
    { accountCode: 'E-405', accountName: 'Utilities',               approvedAmount: 60000,  fiscalYear: 2026 },
    { accountCode: 'E-406', accountName: 'Miscellaneous Expenses',  approvedAmount: 30000,  fiscalYear: 2026 },

    // FY 2025 Budget (Historical)
    { accountCode: 'E-401', accountName: 'Office Supplies',         approvedAmount: 120000, fiscalYear: 2025 },
    { accountCode: 'E-402', accountName: 'Travel & Transportation', approvedAmount: 70000,  fiscalYear: 2025 },
    { accountCode: 'E-403', accountName: 'Meals & Representation',  approvedAmount: 45000,  fiscalYear: 2025 },
    { accountCode: 'E-404', accountName: 'Communication Expenses',  approvedAmount: 35000,  fiscalYear: 2025 },
    { accountCode: 'E-405', accountName: 'Utilities',               approvedAmount: 50000,  fiscalYear: 2025 },
    { accountCode: 'E-406', accountName: 'Miscellaneous Expenses',  approvedAmount: 25000,  fiscalYear: 2025 },

    // FY 2024 Budget (Historical)
    { accountCode: 'E-401', accountName: 'Office Supplies',         approvedAmount: 100000, fiscalYear: 2024 },
    { accountCode: 'E-402', accountName: 'Travel & Transportation', approvedAmount: 60000,  fiscalYear: 2024 },
    { accountCode: 'E-403', accountName: 'Meals & Representation',  approvedAmount: 40000,  fiscalYear: 2024 },
    { accountCode: 'E-404', accountName: 'Communication Expenses',  approvedAmount: 30000,  fiscalYear: 2024 },
    { accountCode: 'E-405', accountName: 'Utilities',               approvedAmount: 45000,  fiscalYear: 2024 },
    { accountCode: 'E-406', accountName: 'Miscellaneous Expenses',  approvedAmount: 20000,  fiscalYear: 2024 },
  ];
  await prisma.budgetCategory.createMany({ data: budgetCategories });

  // 8. Expense Vouchers (POSTED – these will count against budget spend)
  const vouchersData = [
    // FY 2026 Posted Vouchers
    {
      voucherNumber: 'EV-2026-001',
      date: new Date('2026-06-02'),
      payee: 'National Bookstore',
      purpose: 'Bond paper reams and ballpens',
      amount: 1500,
      accountCode: 'E-401',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2026-06-02'),
    },
    {
      voucherNumber: 'EV-2026-002',
      date: new Date('2026-06-03'),
      payee: 'Grab Philippines',
      purpose: 'Taxi fare for Baguio field visit',
      amount: 850,
      accountCode: 'E-402',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2026-06-03'),
    },
    {
      voucherNumber: 'EV-2026-003',
      date: new Date('2026-06-04'),
      payee: 'Jollibee Corp',
      purpose: 'Team lunch – General Assembly',
      amount: 2200,
      accountCode: 'E-403',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2026-06-04'),
    },
    {
      voucherNumber: 'EV-2026-004',
      date: new Date('2026-06-05'),
      payee: 'PLDT Inc.',
      purpose: 'Monthly internet bill',
      amount: 1200,
      accountCode: 'E-404',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2026-06-05'),
    },
    {
      voucherNumber: 'EV-2026-005',
      date: new Date('2026-06-07'),
      payee: 'Meralco',
      purpose: 'Office electricity – May 2026',
      amount: 3800,
      accountCode: 'E-405',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2026-06-07'),
    },
    {
      voucherNumber: 'EV-2026-006',
      date: new Date('2026-06-08'),
      payee: 'SM Stationery',
      purpose: 'Printer ink cartridges and folders',
      amount: 980,
      accountCode: 'E-401',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2026-06-08'),
    },
    {
      voucherNumber: 'EV-2026-007',
      date: new Date('2026-06-10'),
      payee: 'Various Vendors',
      purpose: 'Miscellaneous supplies for annual meeting',
      amount: 750,
      accountCode: 'E-406',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2026-06-10'),
    },
    {
      voucherNumber: 'EV-2026-008',
      date: new Date('2026-06-11'),
      payee: 'Angkas Inc.',
      purpose: 'Transport to regional BIR office',
      amount: 320,
      accountCode: 'E-402',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2026-06-11'),
    },
    {
      voucherNumber: 'EV-2026-009',
      date: new Date('2026-06-12'),
      payee: 'Mang Inasal',
      purpose: 'Lunch for external auditors',
      amount: 1850,
      accountCode: 'E-403',
      approvedBy: 'Treasurer',
      status: 'APPROVED',
    },
    {
      voucherNumber: 'EV-2026-010',
      date: new Date('2026-06-13'),
      payee: 'Office Warehouse',
      purpose: 'Whiteboard markers and sticky notes',
      amount: 450,
      accountCode: 'E-401',
      approvedBy: null,
      status: 'PENDING',
    },

    // FY 2025 Posted Vouchers
    {
      voucherNumber: 'EV-2025-001',
      date: new Date('2025-05-15'),
      payee: 'National Bookstore',
      purpose: 'Bond paper reams and folders',
      amount: 45000,
      accountCode: 'E-401',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2025-05-15'),
    },
    {
      voucherNumber: 'EV-2025-002',
      date: new Date('2025-06-20'),
      payee: 'Grab Philippines',
      purpose: 'Fares for regional conference travel',
      amount: 32000,
      accountCode: 'E-402',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2025-06-20'),
    },
    {
      voucherNumber: 'EV-2025-003',
      date: new Date('2025-08-10'),
      payee: 'Meralco',
      purpose: 'Office electricity - Q2 2025',
      amount: 41000,
      accountCode: 'E-405',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2025-08-10'),
    },

    // FY 2024 Posted Vouchers
    {
      voucherNumber: 'EV-2024-001',
      date: new Date('2024-04-10'),
      payee: 'National Bookstore',
      purpose: 'Office equipment and furniture setup',
      amount: 38000,
      accountCode: 'E-401',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2024-04-10'),
    },
    {
      voucherNumber: 'EV-2024-002',
      date: new Date('2024-05-12'),
      payee: 'PLDT Inc.',
      purpose: 'Internet hardware installation',
      amount: 15000,
      accountCode: 'E-404',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2024-05-12'),
    },
    {
      voucherNumber: 'EV-2024-003',
      date: new Date('2024-07-15'),
      payee: 'SM Prime',
      purpose: 'Annual assembly venue deposit',
      amount: 18000,
      accountCode: 'E-406',
      approvedBy: 'Treasurer',
      status: 'POSTED',
      postedAt: new Date('2024-07-15'),
    },
  ];
  const createdVouchers = [];
  for (const v of vouchersData) {
    const voucher = await prisma.expenseVoucher.create({ data: v });
    createdVouchers.push(voucher);
  }

  // 9. Petty Cash Transactions (Append-only ledger)
  // Running balance starts from 0; replenishments go in, disbursements go out.
  const pettyCashEntries = [
    // Opening replenishment - Jun 1
    { type: 'REPLENISHMENT', amount: 10000, description: 'Opening Petty Cash Fund – June 2026', transactedAt: new Date('2026-06-01T08:00:00Z'), voucherNumber: null },
    // Disbursements based on posted vouchers
    { type: 'DISBURSEMENT', amount: 1500,  description: `Disbursement: Bond paper reams – EV-2026-001`,    transactedAt: new Date('2026-06-02T10:00:00Z'), voucherNumber: 'EV-2026-001' },
    { type: 'DISBURSEMENT', amount: 850,   description: `Disbursement: Taxi fare Baguio – EV-2026-002`,   transactedAt: new Date('2026-06-03T09:30:00Z'), voucherNumber: 'EV-2026-002' },
    { type: 'DISBURSEMENT', amount: 2200,  description: `Disbursement: Team lunch Assembly – EV-2026-003`, transactedAt: new Date('2026-06-04T12:00:00Z'), voucherNumber: 'EV-2026-003' },
    { type: 'DISBURSEMENT', amount: 1200,  description: `Disbursement: PLDT internet – EV-2026-004`,       transactedAt: new Date('2026-06-05T11:00:00Z'), voucherNumber: 'EV-2026-004' },
    // Mid-month replenishment
    { type: 'REPLENISHMENT', amount: 5000, description: 'Mid-month Replenishment from General Fund',        transactedAt: new Date('2026-06-06T08:00:00Z'), voucherNumber: null },
    { type: 'DISBURSEMENT', amount: 3800,  description: `Disbursement: Meralco electricity – EV-2026-005`, transactedAt: new Date('2026-06-07T10:00:00Z'), voucherNumber: 'EV-2026-005' },
    { type: 'DISBURSEMENT', amount: 980,   description: `Disbursement: Printer ink/folders – EV-2026-006`, transactedAt: new Date('2026-06-08T14:00:00Z'), voucherNumber: 'EV-2026-006' },
    { type: 'DISBURSEMENT', amount: 750,   description: `Disbursement: Annual meeting supplies – EV-2026-007`, transactedAt: new Date('2026-06-10T09:00:00Z'), voucherNumber: 'EV-2026-007' },
    { type: 'DISBURSEMENT', amount: 320,   description: `Disbursement: Angkas transport – EV-2026-008`,    transactedAt: new Date('2026-06-11T08:30:00Z'), voucherNumber: 'EV-2026-008' },
  ];

  // Compute running balance and insert
  let runningBalance = 0;
  for (const entry of pettyCashEntries) {
    if (entry.type === 'REPLENISHMENT') {
      runningBalance += entry.amount;
    } else {
      runningBalance -= entry.amount;
    }

    // Find matching voucher id if applicable
    let referenceVoucherId = null;
    if (entry.voucherNumber) {
      const v = createdVouchers.find(cv => cv.voucherNumber === entry.voucherNumber);
      if (v) referenceVoucherId = v.id;
    }

    await prisma.pettyCashTransaction.create({
      data: {
        type: entry.type,
        amount: entry.amount,
        description: entry.description,
        runningBalance,
        referenceVoucherId,
        transactedAt: entry.transactedAt,
      }
    });
  }

  console.log(`✅ Petty Cash seeded: ${pettyCashEntries.length} transactions, final balance: ₱${runningBalance}`);

  // 10. Loan Write-Off Requests
  const writeOffs = [
    {
      loanReference: 'LN-2026-080',
      memberId: 'M-2018-099',
      memberName: 'RAMIREZ, DANTE G.',
      amount: 25000,
      reason: 'Member deceased, no estate or collateral remaining.',
      status: 'PENDING',
      requestedBy: 'Treasurer Office',
      authorizedBy: null
    },
    {
      loanReference: 'LN-2026-083',
      memberId: 'M-2019-044',
      memberName: 'SANTIAGO, ELENA M.',
      amount: 12000,
      reason: 'Member left the union, address unknown for over 2 years.',
      status: 'APPROVED',
      requestedBy: 'Treasurer Office',
      authorizedBy: 'President Office'
    },
    {
      loanReference: 'LN-2026-084',
      memberId: 'M-2020-008',
      memberName: 'DOMINGO, FELIPE K.',
      amount: 8000,
      reason: 'Disputed amount settled by compromise agreement.',
      status: 'REJECTED',
      requestedBy: 'Treasurer Office',
      authorizedBy: 'President Office'
    }
  ];
  await prisma.loanWriteOff.createMany({ data: writeOffs });
  console.log(`✅ Seeded ${writeOffs.length} write-off requests.`);

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
