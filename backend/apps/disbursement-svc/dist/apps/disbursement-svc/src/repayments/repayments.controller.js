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
var RepaymentsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepaymentsController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const repayments_service_1 = require("./repayments.service");
const events_1 = require("@backend/events");
const auth_1 = require("@bdoea-fs/auth");
let RepaymentsController = RepaymentsController_1 = class RepaymentsController {
    constructor(repaymentsService) {
        this.repaymentsService = repaymentsService;
        this.logger = new common_1.Logger(RepaymentsController_1.name);
    }
    findAll() {
        return this.repaymentsService.findAll();
    }
    async handleRepaymentPosted(data, context) {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        try {
            this.logger.log(`Received repayment event for loan: ${data?.loanReference || 'unknown'}`);
            await this.repaymentsService.processRepayment(data);
            channel.ack(originalMsg);
            this.logger.log(`Successfully processed repayment for loan ${data.loanReference}`);
        }
        catch (error) {
            this.logger.error(`Failed to process repayment event [ref: ${data?.loanReference}]: ${error.message}`, error.stack);
            channel.nack(originalMsg, false, false);
        }
    }
};
exports.RepaymentsController = RepaymentsController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RepaymentsController.prototype, "findAll", null);
__decorate([
    (0, microservices_1.MessagePattern)(events_1.QUEUE_REPAYMENTS),
    __param(0, (0, microservices_1.Payload)()),
    __param(1, (0, microservices_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, microservices_1.RmqContext]),
    __metadata("design:returntype", Promise)
], RepaymentsController.prototype, "handleRepaymentPosted", null);
exports.RepaymentsController = RepaymentsController = RepaymentsController_1 = __decorate([
    (0, common_1.Controller)('repayments'),
    __metadata("design:paramtypes", [repayments_service_1.RepaymentsService])
], RepaymentsController);
//# sourceMappingURL=repayments.controller.js.map