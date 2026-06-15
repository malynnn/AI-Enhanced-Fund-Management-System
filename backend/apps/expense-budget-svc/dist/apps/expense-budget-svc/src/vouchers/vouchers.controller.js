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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VouchersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const vouchers_service_1 = require("./vouchers.service");
const receipt_service_1 = require("./receipt.service");
const auth_1 = require("@bdoea-fs/auth");
let VouchersController = class VouchersController {
    vouchersService;
    receiptService;
    constructor(vouchersService, receiptService) {
        this.vouchersService = vouchersService;
        this.receiptService = receiptService;
    }
    findAll(status) {
        return this.vouchersService.findAll(status);
    }
    create(data, req) {
        const user = req.user?.username || 'Treasurer';
        return this.vouchersService.create(data, user);
    }
    update(id, data, req) {
        const user = req.user?.username || 'Treasurer';
        return this.vouchersService.update(id, data, user);
    }
    delete(id, req) {
        const user = req.user?.username || 'Treasurer';
        return this.vouchersService.delete(id, user);
    }
    approveOrReject(id, decision, req) {
        const authorizedBy = req.user?.username || 'Approver';
        return this.vouchersService.approveOrReject(id, decision, authorizedBy);
    }
    postVoucher(id, req) {
        const user = req.user?.username || 'Treasurer';
        return this.vouchersService.post(id, user);
    }
    uploadReceipt(id, file) {
        return this.receiptService.uploadReceipt(id, file);
    }
};
exports.VouchersController = VouchersController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VouchersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], VouchersController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], VouchersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], VouchersController.prototype, "delete", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('decision')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], VouchersController.prototype, "approveOrReject", null);
__decorate([
    (0, common_1.Patch)(':id/post'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], VouchersController.prototype, "postVoucher", null);
__decorate([
    (0, common_1.Post)(':id/receipt'),
    (0, auth_1.Public)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('receipt', { storage: (0, multer_1.memoryStorage)() })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], VouchersController.prototype, "uploadReceipt", null);
exports.VouchersController = VouchersController = __decorate([
    (0, common_1.Controller)('vouchers'),
    __metadata("design:paramtypes", [vouchers_service_1.VouchersService,
        receipt_service_1.ReceiptService])
], VouchersController);
//# sourceMappingURL=vouchers.controller.js.map