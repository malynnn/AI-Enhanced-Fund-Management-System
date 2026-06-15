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
var WriteOffsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteOffsController = void 0;
const common_1 = require("@nestjs/common");
const write_offs_service_1 = require("./write-offs.service");
const auth_1 = require("@bdoea-fs/auth");
let WriteOffsController = WriteOffsController_1 = class WriteOffsController {
    constructor(writeOffsService) {
        this.writeOffsService = writeOffsService;
        this.logger = new common_1.Logger(WriteOffsController_1.name);
    }
    findAll() {
        return this.writeOffsService.findAll();
    }
    createRequest(loanReference, memberId, memberName, amount, reason, requestedBy) {
        return this.writeOffsService.createWriteOffRequest({
            loanReference,
            memberId,
            memberName,
            amount,
            reason,
            requestedBy,
        });
    }
    approveOrReject(loanReference, decision, authorizedBy) {
        return this.writeOffsService.approveOrRejectWriteOff(loanReference, decision, authorizedBy);
    }
};
exports.WriteOffsController = WriteOffsController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WriteOffsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, auth_1.Roles)('Treasurer'),
    __param(0, (0, common_1.Body)('loanReference')),
    __param(1, (0, common_1.Body)('memberId')),
    __param(2, (0, common_1.Body)('memberName')),
    __param(3, (0, common_1.Body)('amount')),
    __param(4, (0, common_1.Body)('reason')),
    __param(5, (0, common_1.Body)('requestedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, String, String]),
    __metadata("design:returntype", void 0)
], WriteOffsController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Put)(),
    (0, auth_1.Roles)('Treasurer'),
    __param(0, (0, common_1.Body)('loanReference')),
    __param(1, (0, common_1.Body)('decision')),
    __param(2, (0, common_1.Body)('authorizedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], WriteOffsController.prototype, "approveOrReject", null);
exports.WriteOffsController = WriteOffsController = WriteOffsController_1 = __decorate([
    (0, common_1.Controller)('loans/write-offs'),
    __metadata("design:paramtypes", [write_offs_service_1.WriteOffsService])
], WriteOffsController);
//# sourceMappingURL=write-offs.controller.js.map