import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config'; // Ensures it can read your DATABASE_URL from the .env file

// Set up the PostgreSQL connection pool and adapter required by Prisma 7
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
      password: 'hashed_password_here', // Use a real hash if testing login
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

  console.log('✅ Mock financial ledger profiles injected.');
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