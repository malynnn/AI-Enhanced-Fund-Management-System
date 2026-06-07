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
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const events_1 = require("@backend/events");
const auth_1 = require("@bdoea-fs/auth");
const prisma_service_1 = require("./prisma.service");
const accounts_module_1 = require("./accounts/accounts.module");
const funds_module_1 = require("./funds/funds.module");
const rabbitMqClients = microservices_1.ClientsModule.register([
    { name: 'DUES_CLIENT', transport: microservices_1.Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: events_1.QUEUE_DUES, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${events_1.QUEUE_DUES}` } } } },
    { name: 'DISBURSEMENTS_CLIENT', transport: microservices_1.Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: events_1.QUEUE_DISBURSEMENTS, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${events_1.QUEUE_DISBURSEMENTS}` } } } },
    { name: 'REPAYMENTS_CLIENT', transport: microservices_1.Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: events_1.QUEUE_REPAYMENTS, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${events_1.QUEUE_REPAYMENTS}` } } } },
    { name: 'BUDGET_ALERTS_CLIENT', transport: microservices_1.Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: events_1.QUEUE_BUDGET_ALERTS, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${events_1.QUEUE_BUDGET_ALERTS}` } } } },
    { name: 'AUDIT_CLIENT', transport: microservices_1.Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: events_1.QUEUE_AUDIT, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${events_1.QUEUE_AUDIT}` } } } },
]);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [rabbitMqClients, accounts_module_1.AccountsModule, funds_module_1.FundsModule],
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