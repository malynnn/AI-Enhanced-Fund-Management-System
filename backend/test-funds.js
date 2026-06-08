const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const funds = await prisma.fund.findMany({
      include: {
        transactions: true,
      },
    });
    console.log("SUCCESS:", JSON.stringify(funds, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
