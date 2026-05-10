const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Database Test...\n");

  console.log("1. Testing User Creation...");
  const user = await prisma.user.create({
    data: {
      email: "test_check_" + Date.now() + "@example.com",
      password: "hashedpassword123",
      role: "ADMIN"
    }
  });
  console.log("✅ User successfully created! Email:", user.email);

  console.log("\n2. Testing Audit Log Creation...");
  const log = await prisma.fSAuditLog.create({
    data: {
      user_id: user.id,
      action_type: "POST",
      table_name: "sample_table",
      record_id: "999",
      new_value_json: { status: "created" }
    }
  });
  console.log("✅ Audit Log successfully created! Log ID:", log.id);

  console.log("\n3. Testing Immutability Trigger (Attempting to UPDATE the log)...");
  try {
    await prisma.fSAuditLog.update({
      where: { id: log.id },
      data: { action_type: "PUT" }
    });
    console.log("❌ ERROR: The update succeeded. The trigger did NOT work.");
  } catch (error) {
    console.log("✅ TRIGGER WORKED: The database successfully blocked the update!");
    console.log("   ➡ DB Error:", error.message.split('\n').pop());
  }

  console.log("\n4. Testing Immutability Trigger (Attempting to DELETE the log)...");
  try {
    await prisma.fSAuditLog.delete({
      where: { id: log.id }
    });
    console.log("❌ ERROR: The delete succeeded. The trigger did NOT work.");
  } catch (error) {
    console.log("✅ TRIGGER WORKED: The database successfully blocked the delete!");
  }
}

main()
  .catch(e => console.error("Test failed:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
