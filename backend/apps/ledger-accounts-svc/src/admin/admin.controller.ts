import { Controller, Get, Post, Put, Body, Param, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Public } from '@bdoea-fs/auth';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  private readonly suspendedUserIds = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  @Get('users')
  @Public()
  async getUsers() {
    this.logger.log('Fetching all users');
    
    // Get all users from User table
    const dbUsers = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Get all disbursement requests to map memberIds to memberNames
    const disbursements = await this.prisma.disbursementRequest.findMany({
      select: { memberId: true, memberName: true },
    });

    const memberNamesMap = new Map<string, string>();
    disbursements.forEach(d => {
      memberNamesMap.set(d.memberId, d.memberName);
    });

    return dbUsers.map(user => {
      // Map SystemRole to frontend roles
      let role = 'Member';
      if (user.role === 'ADMIN') role = 'Admin';
      else if (user.role === 'TREASURER') role = 'Treasurer';
      else if (user.role === 'PRESIDENT') role = 'President';
      
      if (user.email === 'auditor') role = 'Auditor';

      // Resolve name
      let name = user.email.toUpperCase();
      if (memberNamesMap.has(user.id)) {
        name = memberNamesMap.get(user.id);
      } else if (user.email === 'admin') {
        name = 'System Admin';
      } else if (user.email === 'treasurer') {
        name = 'Treasurer';
      } else if (user.email === 'president') {
        name = 'President';
      } else if (user.email === 'auditor') {
        name = 'Auditor';
      }

      return {
        id: user.id,
        name,
        email: user.email,
        role,
        status: this.suspendedUserIds.has(user.id) ? 'SUSPENDED' : 'ACTIVE',
        joinedAt: user.createdAt.toISOString(),
      };
    });
  }

  @Post('users')
  @Public()
  async createUser(@Body() body: any) {
    this.logger.log(`Creating user: ${JSON.stringify(body)}`);
    const { name, email, role, password } = body;

    // Map frontend roles to SystemRole enum
    let dbRole = 'USER';
    if (role === 'Admin' || role === 'Superadmin') dbRole = 'ADMIN';
    else if (role === 'Treasurer') dbRole = 'TREASURER';
    else if (role === 'President') dbRole = 'PRESIDENT';

    // Create record in User table
    const user = await this.prisma.user.create({
      data: {
        email,
        password, // stored plain text for mock auth
        role: dbRole as any,
      },
    });

    // If it's a Member, also create a dummy disbursement record if it doesn't exist so the name resolves correctly
    if (dbRole === 'USER' && email.startsWith('M-')) {
      const existingDisbursement = await this.prisma.disbursementRequest.findFirst({
        where: { memberId: email },
      });
      if (!existingDisbursement) {
        await this.prisma.disbursementRequest.create({
          data: {
            loanReference: `LN-AUTO-${Math.floor(Math.random() * 10000)}`,
            memberId: email,
            memberName: name,
            amount: 0,
            paymentMethod: 'CASH',
            bankAccount: 'N/A',
            status: 'PENDING',
            fundId: 'LN',
          },
        });
      }
    }

    return user;
  }

  @Put('users/:id/status')
  @Public()
  async toggleUserStatus(@Param('id') id: string, @Body() body: { status: 'ACTIVE' | 'SUSPENDED' }) {
    this.logger.log(`Toggling user ${id} status to ${body.status}`);
    if (body.status === 'SUSPENDED') {
      this.suspendedUserIds.add(id);
    } else {
      this.suspendedUserIds.delete(id);
    }
    return { success: true };
  }

  @Get('requests')
  @Public()
  getRequests() {
    this.logger.log('Fetching registration requests');
    // Return empty list as registration approvals are handled out-of-band/mocked
    return [];
  }

  @Get('activity')
  @Public()
  async getActivityLogs() {
    this.logger.log('Fetching activity logs');
    const logs = await this.prisma.fSAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return logs.map(l => ({
      id: l.id,
      user: l.user_id || 'System',
      action: `${l.action_type} on ${l.table_name} (Record ID: ${l.record_id})`,
      type: 'SECURITY',
      createdAt: l.timestamp.toISOString(),
    }));
  }
}
