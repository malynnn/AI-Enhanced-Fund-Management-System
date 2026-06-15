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
var OverpaymentsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverpaymentsController = void 0;
const common_1 = require("@nestjs/common");
const repayments_service_1 = require("./repayments.service");
const auth_1 = require("@bdoea-fs/auth");
let OverpaymentsController = OverpaymentsController_1 = class OverpaymentsController {
    constructor(repaymentsService) {
        this.repaymentsService = repaymentsService;
        this.logger = new common_1.Logger(OverpaymentsController_1.name);
    }
    findOverpayments() {
        return this.repaymentsService.findOverpayments();
    }
    resolveOverpayment(repaymentId, decision, authorizedBy) {
        return this.repaymentsService.resolveOverpayment(repaymentId, decision, authorizedBy);
    }
};
exports.OverpaymentsController = OverpaymentsController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OverpaymentsController.prototype, "findOverpayments", null);
__decorate([
    (0, common_1.Put)(),
    (0, auth_1.Roles)('Treasurer'),
    __param(0, (0, common_1.Body)('repaymentId')),
    __param(1, (0, common_1.Body)('decision')),
    __param(2, (0, common_1.Body)('authorizedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], OverpaymentsController.prototype, "resolveOverpayment", null);
exports.OverpaymentsController = OverpaymentsController = OverpaymentsController_1 = __decorate([
    (0, common_1.Controller)('loans/overpayments'),
    __metadata("design:paramtypes", [repayments_service_1.RepaymentsService])
], OverpaymentsController);
//# sourceMappingURL=overpayments.controller.js.map