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
var DisbursementsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisbursementsController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const disbursements_service_1 = require("./disbursements.service");
const events_1 = require("@backend/events");
const auth_1 = require("@bdoea-fs/auth");
let DisbursementsController = DisbursementsController_1 = class DisbursementsController {
    constructor(disbursementsService) {
        this.disbursementsService = disbursementsService;
        this.logger = new common_1.Logger(DisbursementsController_1.name);
    }
    findAll() {
        return this.disbursementsService.findAll();
    }
    confirm(id, authorizedBy) {
        return this.disbursementsService.confirmDisbursement(id, authorizedBy);
    }
    reject(id, reason, authorizedBy) {
        return this.disbursementsService.rejectDisbursement(id, reason, authorizedBy);
    }
    async handleLoanApproved(data, context) {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        try {
            this.logger.log(`Received loan approved event for reference: ${data?.loanReference || 'unknown'}`);
            await this.disbursementsService.processLoanApproved(data);
            channel.ack(originalMsg);
            this.logger.log(`Successfully processed disbursement for loan ${data.loanReference}`);
        }
        catch (error) {
            this.logger.error(`Failed to process loan approved event [ref: ${data?.loanReference}]: ${error.message}`, error.stack);
            channel.nack(originalMsg, false, false);
        }
    }
};
exports.DisbursementsController = DisbursementsController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DisbursementsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('authorizedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DisbursementsController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Body)('authorizedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DisbursementsController.prototype, "reject", null);
__decorate([
    (0, microservices_1.MessagePattern)(events_1.QUEUE_DISBURSEMENTS),
    __param(0, (0, microservices_1.Payload)()),
    __param(1, (0, microservices_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, microservices_1.RmqContext]),
    __metadata("design:returntype", Promise)
], DisbursementsController.prototype, "handleLoanApproved", null);
exports.DisbursementsController = DisbursementsController = DisbursementsController_1 = __decorate([
    (0, common_1.Controller)('disbursements'),
    __metadata("design:paramtypes", [disbursements_service_1.DisbursementsService])
], DisbursementsController);
//# sourceMappingURL=disbursements.controller.js.map