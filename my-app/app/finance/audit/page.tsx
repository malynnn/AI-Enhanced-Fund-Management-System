// app/finance/audit-logs/page.tsx
import { prisma } from '@/lib/db'; // Make sure this matches your Prisma export path
import AuditLogClient from '@/components/AuditLogClient'; // Import the client file from Step 1

// Setting dynamic forces Next.js to fetch fresh logs on every page refresh
export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  
  // 1. Fetch live records from the database
  const dbLogs = await prisma.fSAuditLog.findMany({
    orderBy: {
      timestamp: 'desc',
    },
    include: {
      user: true, // Joins the User table to get emails
    },
  });

  // 2. Map database properties cleanly into your UI's layout structure
  const formattedLogs = dbLogs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(), // Standardizes the date format
    user: log.user?.email || 'system@pup.edu.ph', // Shows user email or fallback
    actionType: log.action_type,
    target: log.table_name,
    // Safely reads details out of your saved new_value_json data or falls back to record ID
    details: log.new_value_json 
      ? JSON.stringify(log.new_value_json) 
      : `Modified item with record ID: ${log.record_id}`,
  }));

  // 3. Render the client view and pass the database data down!
  return <AuditLogClient initialLogs={formattedLogs} />;
}