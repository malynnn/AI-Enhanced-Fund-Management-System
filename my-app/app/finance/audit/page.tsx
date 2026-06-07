// app/finance/audit/page.tsx
import AuditLogClient from '@/components/AuditLogClient'; 

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  let formattedLogs: any[] = [];

  try {
    const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';
    const res = await fetch(`${GATEWAY_URL}/api/finance/audit`, { cache: 'no-store' });
    
    if (res.ok) {
      const dbLogs = await res.json();
      formattedLogs = dbLogs.map((log: any) => ({
        id: log.id,
        timestamp: new Date(log.timestamp).toISOString(),
        user: log.user || 'system@pup.edu.ph',
        actionType: log.action_type || log.action,
        target: log.table_name || log.entityType,
        details: log.new_value_json 
          ? JSON.stringify(log.new_value_json) 
          : JSON.stringify(log.details || {}),
      }));
    }
  } catch (error) {
    console.error("Fetch error in Audit Logs:", error);
  }

  return <AuditLogClient initialLogs={formattedLogs} />;
}