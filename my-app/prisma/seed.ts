import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

// Siguraduhing may access ang process constructor dito
dotenv.config({ path: '.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Mock Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: {},
    create: {
      email: 'admin@system.com',
      password: 'hashed_password_here', 
      role: 'ADMIN',
    },
  });

  const treasurerUser = await prisma.user.upsert({
    where: { email: 'treasurer@system.com' },
    update: {},
    create: {
      email: 'treasurer@system.com',
      password: 'hashed_password_here',
      role: 'TREASURER',
    },
  });

  console.log('✅ Mock users created.');

  // 2. Create Mock Report Signoffs
  const mockSignoff = await prisma.reportSignoff.create({
    data: {
      report_id: 'report-2026-q1',
      user_id: treasurerUser.id,
      role: 'TREASURER',
      digital_sig: 'sig_crypto_hash_123456',
    },
  });
  console.log('✅ Mock report signoffs created.');

  // 3. Create Mock Audit Logs
  await prisma.fSAuditLog.create({
    data: {
      user_id: adminUser.id,
      action_type: 'POST',
      table_name: 'User',
      record_id: treasurerUser.id,
      new_value_json: { email: 'treasurer@system.com', role: 'TREASURER' },
      ip_address: '127.0.0.1',
    },
  });

  await prisma.fSAuditLog.create({
    data: {
      user_id: treasurerUser.id,
      action_type: 'POST',
      table_name: 'report_signoffs',
      record_id: mockSignoff.id,
      new_value_json: { report_id: 'report-2026-q1', status: 'SIGNED' },
      ip_address: '192.168.1.50',
    },
  });
  console.log('✅ Mock audit logs generated.');

  // ==========================================
  // 4. Create Mock Fund Ledgers (FS-004)
  // ==========================================
  console.log('🔄 Populating real-time financial ledger accounts...');

  // General Fund Setup
  await prisma.fund.upsert({
    where: { code: 'GF' },
    update: {},
    create: {
      name: 'General Fund',
      code: 'GF',
      balance: 1812350.00,
      transactions: {
        create: [
          { amount: 1827350.00, type: 'DEPOSIT', description: 'Member Dues Batch Remittance', referenceId: 'REF-8812' },
          { amount: -15000.00, type: 'WITHDRAWAL', description: 'Office Supplies Vendor Payment', referenceId: 'REF-8809' }
        ]
      }
    }
  });

  // Union Fund Setup
  await prisma.fund.upsert({
    where: { code: 'UF' },
    update: {},
    create: {
      name: 'Union Fund',
      code: 'UF',
      balance: 4520900.00,
      transactions: {
        create: [
          { amount: 4532900.00, type: 'DEPOSIT', description: 'Quarterly Dividend Allocation', referenceId: 'REF-9901' },
          { amount: -12000.00, type: 'WITHDRAWAL', description: 'Union Assembly Expense', referenceId: 'UN-2026-004' }
        ]
      }
    }
  });

  // Loans Capital Setup
  await prisma.fund.upsert({
    where: { code: 'LN' },
    update: {},
    create: {
      name: 'Loans Capital',
      code: 'LN',
      balance: 1518750.00,
      transactions: {
        create: [
          { amount: -30000.00, type: 'LOAN_DISBURSEMENT', description: 'Disbursement: VINLUAN, VEN', referenceId: 'LN-2026-071' }
        ]
      }
    }
  });

  // Foreign Assistance Setup
  await prisma.fund.upsert({
    where: { code: 'FA' },
    update: {},
    create: {
      name: 'Foreign Assistance',
      code: 'FA',
      balance: 2500000.00,
      transactions: {
        create: [
          { amount: 2500000.00, type: 'DEPOSIT', description: 'Foreign Grant Received', referenceId: 'FG-8801' }
        ]
      }
    }
  });

  // Death Assistance Setup
  await prisma.fund.upsert({
    where: { code: 'DA' },
    update: {},
    create: {
      name: 'Death Assistance',
      code: 'DA',
      balance: 850000.00,
      transactions: {
        create: [
          { amount: -20000.00, type: 'WITHDRAWAL', description: 'Death Claim Benefit Release', referenceId: 'DC-2026-012' }
        ]
      }
    }
  });

  // REQUIRED FOR ACCEPTANCE CRITERIA
  await prisma.fund.upsert({
    where: { code: 'LOAN_BDOEA' },
    update: {},
    create: {
      name: 'BDOEA Loans Fund',
      code: 'LOAN_BDOEA',
      balance: 1000000.00,
    },
  });

  console.log('✅ BDOEA Loans Fund initialized successfully.');

  // ==========================================
  // 5. Seed Chart of Accounts (Backend Task)
  // ==========================================
  console.log('🔄 Seeding Chart of Accounts...');

  const defaultAccounts = [
    { code: '1010', name: 'General Cash Fund',                  type: 'Asset',     fund: 'General Fund',       status: 'Active'   },
    { code: '1100', name: 'Loan Receivables',                   type: 'Asset',     fund: 'Loans',              status: 'Active'   },
    { code: '2010', name: 'Union Accounts Payable',             type: 'Liability', fund: 'Union Fund',         status: 'Active'   },
    { code: '5020', name: 'Foreign Assistance Project Expenses',type: 'Expense',   fund: 'Foreign Assistance', status: 'Inactive' },
    { code: '6010', name: 'Death Benefit Disbursements',        type: 'Expense',   fund: 'Death Assistance',   status: 'Active'   },
  ];

  for (const acc of defaultAccounts) {
    await prisma.chartOfAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: acc,
    });
  }

  // ==========================================
  // 6. Seed FS-006 Data (Expense Vouchers, Petty Cash, Budgets)
  // ==========================================
  console.log('🔄 Seeding FS-006 Budget Categories, Expense Vouchers, and Petty Cash...');

  // 6a. Budgets
  const currentYear = new Date().getFullYear();
  await prisma.budgetCategory.upsert({
    where: { accountCode: '5020' },
    update: {},
    create: {
      accountCode: '5020',
      accountName: 'Foreign Assistance Project Expenses',
      approvedAmount: 500000.00,
      fiscalYear: currentYear,
    },
  });

  await prisma.budgetCategory.upsert({
    where: { accountCode: '6010' },
    update: {},
    create: {
      accountCode: '6010',
      accountName: 'Death Benefit Disbursements',
      approvedAmount: 200000.00,
      fiscalYear: currentYear,
    },
  });

  // 6b. Expense Vouchers
  const approvedVoucher = await prisma.expenseVoucher.upsert({
    where: { voucherNumber: 'EV-2026-001' },
    update: {},
    create: {
      voucherNumber: 'EV-2026-001',
      date: new Date(),
      payee: 'Juan Dela Cruz',
      purpose: 'Death Benefit Claim - Member 101',
      amount: 15000.00,
      accountCode: '6010',
      approvedBy: treasurerUser.id,
      status: 'APPROVED',
    },
  });

  const pendingVoucher = await prisma.expenseVoucher.upsert({
    where: { voucherNumber: 'EV-2026-002' },
    update: {},
    create: {
      voucherNumber: 'EV-2026-002',
      date: new Date(),
      payee: 'Office Warehouse',
      purpose: 'Project Supplies',
      amount: 5500.00,
      accountCode: '5020',
      status: 'PENDING',
    },
  });

  // 6c. Petty Cash
  await prisma.pettyCashTransaction.create({
    data: {
      type: 'REPLENISHMENT',
      amount: 10000.00,
      description: 'Initial Petty Cash Fund Replenishment',
      runningBalance: 10000.00,
    }
  });

  await prisma.pettyCashTransaction.create({
    data: {
      type: 'DISBURSEMENT',
      amount: 1500.00,
      description: 'Emergency supplies',
      runningBalance: 8500.00,
    }
  });
  console.log('✅ FS-006 Data seeded.');

  console.log('🏁 Seeding complete!');

}

main()
  .catch((e) => {
    console.error('❌ Seeding failed runtime error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });