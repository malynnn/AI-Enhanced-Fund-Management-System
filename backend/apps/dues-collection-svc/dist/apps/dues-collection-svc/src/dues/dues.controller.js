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
var DuesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuesController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const dues_service_1 = require("./dues.service");
const events_1 = require("@backend/events");
const auth_1 = require("@bdoea-fs/auth");
let DuesController = DuesController_1 = class DuesController {
    constructor(duesService) {
        this.duesService = duesService;
        this.logger = new common_1.Logger(DuesController_1.name);
    }
    findAll(status) {
        return this.duesService.findAll(status);
    }
    confirmDues(id) {
        return this.duesService.confirmDues(id);
    }
    async handleDuesEvent(data, context) {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        try {
            this.logger.log(`Received dues event for transaction ${data?.transactionId || 'unknown'}`);
            await this.duesService.processDuesEvent(data);
            channel.ack(originalMsg);
        }
        catch (error) {
            this.logger.error(`Error processing dues event: ${error.message}`);
            channel.nack(originalMsg, false, false);
        }
    }
};
exports.DuesController = DuesController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DuesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id/confirm'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DuesController.prototype, "confirmDues", null);
__decorate([
    (0, microservices_1.MessagePattern)(events_1.QUEUE_DUES),
    (0, microservices_1.MessagePattern)('ms.dues.payroll_confirmed'),
    __param(0, (0, microservices_1.Payload)()),
    __param(1, (0, microservices_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, microservices_1.RmqContext]),
    __metadata("design:returntype", Promise)
], DuesController.prototype, "handleDuesEvent", null);
exports.DuesController = DuesController = DuesController_1 = __decorate([
    (0, common_1.Controller)('dues'),
    __metadata("design:paramtypes", [dues_service_1.DuesService])
], DuesController);
//# sourceMappingURL=dues.controller.js.map