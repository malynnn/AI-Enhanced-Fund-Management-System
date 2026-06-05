// app/finance/audit/page.tsx
import { prisma } from '@/lib/db'; 
import AuditLogClient from '@/components/AuditLogClient'; // Properly pointing to the components folder!

// Setting dynamic forces Next.js to fetch fresh logs on every page refresh
export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  let formattedLogs: any[] = [];

  try {
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
    formattedLogs = dbLogs.map((log: any) => ({
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
    
  } catch (error) {
    // Graceful fallback: If the database is migrating or empty, catch the error instead of crashing Next.js
    console.error("Database connection or schema error in Audit Logs:", error);
    // formattedLogs remains an empty array [], triggering our "No logs found" UI state automatically
  }

  // 3. Render the beautifully redesigned client view and pass the database data down!
  return <AuditLogClient initialLogs={formattedLogs} />;
}