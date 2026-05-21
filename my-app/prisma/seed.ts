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

  // 1. Clear existing data (Be careful: Delete orders matter because of Foreign Keys!)
  // Note: We CANNOT delete from fs_audit_log because of your trigger! 
  // If you need to clear audit logs during dev, you'd have to manually drop the table in pgAdmin, 
  // but for seeding, we will just create unique users.
  
  // 2. Create Mock Users
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

  // 3. Create Mock Report Signoffs
  const mockSignoff = await prisma.reportSignoff.create({
    data: {
      report_id: 'report-2026-q1',
      user_id: treasurerUser.id,
      role: 'TREASURER',
      digital_sig: 'sig_crypto_hash_123456',
    },
  });
  console.log('✅ Mock report signoffs created.');

  // 4. Create Mock Audit Logs
  // This proves your insert flow works flawlessly even with the immutability triggers active!
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
  console.log('🏁 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });