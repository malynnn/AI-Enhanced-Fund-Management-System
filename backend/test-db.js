const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:capstone@localhost:5432/finance_db?schema=public' } } });

async function main() {
  try {
    await prisma.$connect();
    // Use the exact model name DuesRecord
    const records = await prisma.duesRecord.findMany({ take: 1 });
    console.log('? Connection and Query successful! Found ' + records.length + ' DuesRecord(s).');
  } catch (err) {
    console.error('? Query failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
