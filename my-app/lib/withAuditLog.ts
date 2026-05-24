import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

type HttpMethod = 'POST' | 'PUT' | 'DELETE' | 'GET' | 'PATCH';

export function withAuditLog(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  tableName: string
) {
  return async (req: NextRequest, context?: any) => {
    const method = req.method as HttpMethod;
    const ipAddress = req.headers.get('x-forwarded-for') || (req as any).ip || 'Unknown';
    let userId = null;
    
    // Extract User ID from JWT
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_fallback_key') as any;
        userId = decoded.id;
      } catch (err) {
        // Token verification failed, proceed without user_id or return unauthorized
      }
    }

    // Capture request body for POST/PUT (new_value)
    let newValueJson = null;
    let clonedReq = req.clone();
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        newValueJson = await clonedReq.json();
      } catch (e) {
        // Body might be empty or non-JSON
      }
    }

    // Execute the actual route handler
    const response = await handler(req, context);

    // If successful and it's a modifying action, write to audit log
    if (response.ok && ['POST', 'PUT', 'DELETE'].includes(method)) {
      try {
        let recordId = 'Unknown';
        
        // Try to extract recordId from response if possible, or request context
        // In a real app, the handler might return the created/updated record ID
        const responseData = await response.clone().json().catch(() => ({}));
        if (responseData && responseData.id) {
          recordId = responseData.id.toString();
        } else if (context && context.params && context.params.id) {
          recordId = context.params.id;
        }

        await prisma.fSAuditLog.create({
          data: {
            user_id: userId,
            action_type: method,
            table_name: tableName,
            record_id: recordId,
            new_value_json: newValueJson ?? Prisma.JsonNull,
            old_value_json: Prisma.DbNull, // old_value_json requires explicit fetching before update
            ip_address: ipAddress,
          },
        });
      } catch (auditError) {
        console.error('Failed to write audit log:', auditError);
        // Do not fail the request if audit logging fails
      }
    }

    return response;
  };
}
