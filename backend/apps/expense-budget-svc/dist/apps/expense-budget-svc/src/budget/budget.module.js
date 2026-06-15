"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const budget_controller_1 = require("./budget.controller");
const budget_service_1 = require("./budget.service");
const microservices_1 = require("@nestjs/microservices");
const events_1 = require("@backend/events");
let BudgetModule = class BudgetModule {
};
exports.BudgetModule = BudgetModule;
exports.BudgetModule = BudgetModule = __decorate([
    (0, common_1.Module)({
        imports: [
            microservices_1.ClientsModule.register([
                {
                    name: 'BUDGET_ALERTS_CLIENT',
                    transport: microservices_1.Transport.RMQ,
                    options: {
                        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
                        queue: events_1.QUEUE_BUDGET_ALERTS,
                        queueOptions: {
                            durable: true,
                            arguments: {
                                'x-dead-letter-exchange': '',
                                'x-dead-letter-routing-key': `dlq.${events_1.QUEUE_BUDGET_ALERTS}`,
                            },
                        },
                    },
                },
            ]),
        ],
        controllers: [budget_controller_1.BudgetController],
        providers: [prisma_service_1.PrismaService, budget_service_1.BudgetService],
        exports: [prisma_service_1.PrismaService, budget_service_1.BudgetService],
    })
], BudgetModule);
//# sourceMappingURL=budget.module.js.map