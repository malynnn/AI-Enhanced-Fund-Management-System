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
exports.FundsController = void 0;
const common_1 = require("@nestjs/common");
const funds_service_1 = require("./funds.service");
const auth_1 = require("@bdoea-fs/auth");
let FundsController = class FundsController {
    constructor(fundsService) {
        this.fundsService = fundsService;
    }
    findAll() {
        return this.fundsService.findAll();
    }
    findOne(id) {
        return this.fundsService.findById(id);
    }
};
exports.FundsController = FundsController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, auth_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "findOne", null);
exports.FundsController = FundsController = __decorate([
    (0, common_1.Controller)('funds'),
    __metadata("design:paramtypes", [funds_service_1.FundsService])
], FundsController);
//# sourceMappingURL=funds.controller.js.map