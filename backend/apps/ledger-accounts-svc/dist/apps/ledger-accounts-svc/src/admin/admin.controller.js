"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const auth_1 = require("@bdoea-fs/auth");
let AdminController = AdminController_1 = class AdminController {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AdminController_1.name);
        this.suspendedUserIds = new Set();
    }
    async getUsers() {
        this.logger.log('Fetching all users');
        const dbUsers = await this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
        });
        const disbursements = await this.prisma.disbursementRequest.findMany({
            select: { memberId: true, memberName: true },
        });
        const memberNamesMap = new Map();
        disbursements.forEach(d => {
            memberNamesMap.set(d.memberId, d.memberName);
        });
        return dbUsers.map(user => {
            let role = 'Member';
            if (user.role === 'ADMIN')
                role = 'Admin';
            else if (user.role === 'TREASURER')
                role = 'Treasurer';
            else if (user.role === 'PRESIDENT')
                role = 'President';
            if (user.email === 'auditor')
                role = 'Auditor';
            let name = user.email.toUpperCase();
            if (memberNamesMap.has(user.id)) {
                name = memberNamesMap.get(user.id);
            }
            else if (user.email === 'admin') {
                name = 'System Admin';
            }
            else if (user.email === 'treasurer') {
                name = 'Treasurer';
            }
            else if (user.email === 'president') {
                name = 'President';
            }
            else if (user.email === 'auditor') {
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
    async createUser(body) {
        this.logger.log(`Creating user: ${JSON.stringify(body)}`);
        const { name, email, role, password } = body;
        let dbRole = 'USER';
        if (role === 'Admin' || role === 'Superadmin')
            dbRole = 'ADMIN';
        else if (role === 'Treasurer')
            dbRole = 'TREASURER';
        else if (role === 'President')
            dbRole = 'PRESIDENT';
        const user = await this.prisma.user.create({
            data: {
                email,
                password,
                role: dbRole,
            },
        });
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
    async toggleUserStatus(id, body) {
        this.logger.log(`Toggling user ${id} status to ${body.status}`);
        if (body.status === 'SUSPENDED') {
            this.suspendedUserIds.add(id);
        }
        else {
            this.suspendedUserIds.delete(id);
        }
        return { success: true };
    }
    getRequests() {
        this.logger.log('Fetching registration requests');
        return [];
    }
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
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('users'),
    (0, auth_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Post)('users'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createUser", null);
__decorate([
    (0, common_1.Put)('users/:id/status'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "toggleUserStatus", null);
__decorate([
    (0, common_1.Get)('requests'),
    (0, auth_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRequests", null);
__decorate([
    (0, common_1.Get)('activity'),
    (0, auth_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getActivityLogs", null);
exports.AdminController = AdminController = AdminController_1 = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map