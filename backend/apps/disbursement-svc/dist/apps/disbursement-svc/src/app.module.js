"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
const disbursements_module_1 = require("./disbursements/disbursements.module");
const repayments_module_1 = require("./repayments/repayments.module");
const write_offs_module_1 = require("./write-offs/write-offs.module");
const core_1 = require("@nestjs/core");
const auth_1 = require("@bdoea-fs/auth");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            disbursements_module_1.DisbursementsModule,
            repayments_module_1.RepaymentsModule,
            write_offs_module_1.WriteOffsModule,
        ],
        providers: [
            prisma_service_1.PrismaService,
            {
                provide: core_1.APP_GUARD,
                useFactory: () => {
                    const { Reflector } = require('@nestjs/core');
                    return new auth_1.JwtAuthGuard(new Reflector());
                },
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map