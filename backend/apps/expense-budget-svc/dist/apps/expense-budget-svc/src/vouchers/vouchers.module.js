"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VouchersModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const vouchers_controller_1 = require("./vouchers.controller");
const vouchers_service_1 = require("./vouchers.service");
const receipt_service_1 = require("./receipt.service");
const microservices_1 = require("@nestjs/microservices");
const events_1 = require("@backend/events");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
let VouchersModule = class VouchersModule {
};
exports.VouchersModule = VouchersModule;
exports.VouchersModule = VouchersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            platform_express_1.MulterModule.register({ storage: (0, multer_1.memoryStorage)() }),
            microservices_1.ClientsModule.register([
                {
                    name: 'AUDIT_CLIENT',
                    transport: microservices_1.Transport.RMQ,
                    options: {
                        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
                        queue: events_1.QUEUE_AUDIT,
                        queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${events_1.QUEUE_AUDIT}` } },
                    },
                },
                {
                    name: 'BUDGET_ALERTS_CLIENT',
                    transport: microservices_1.Transport.RMQ,
                    options: {
                        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
                        queue: events_1.QUEUE_BUDGET_ALERTS,
                        queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${events_1.QUEUE_BUDGET_ALERTS}` } },
                    },
                },
            ]),
        ],
        controllers: [vouchers_controller_1.VouchersController],
        providers: [prisma_service_1.PrismaService, vouchers_service_1.VouchersService, receipt_service_1.ReceiptService],
        exports: [prisma_service_1.PrismaService, vouchers_service_1.VouchersService],
    })
], VouchersModule);
//# sourceMappingURL=vouchers.module.js.map