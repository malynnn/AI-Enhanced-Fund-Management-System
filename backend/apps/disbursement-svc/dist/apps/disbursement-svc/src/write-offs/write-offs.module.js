"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteOffsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const write_offs_controller_1 = require("./write-offs.controller");
const write_offs_service_1 = require("./write-offs.service");
const microservices_1 = require("@nestjs/microservices");
const LAS_QUEUE = 'queue.ledger';
let WriteOffsModule = class WriteOffsModule {
};
exports.WriteOffsModule = WriteOffsModule;
exports.WriteOffsModule = WriteOffsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            microservices_1.ClientsModule.register([
                {
                    name: 'LAS_CLIENT',
                    transport: microservices_1.Transport.RMQ,
                    options: {
                        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
                        queue: LAS_QUEUE,
                        queueOptions: {
                            durable: true,
                            arguments: {
                                'x-dead-letter-exchange': '',
                                'x-dead-letter-routing-key': `dlq.${LAS_QUEUE}`,
                            },
                        },
                    },
                },
            ]),
        ],
        controllers: [write_offs_controller_1.WriteOffsController],
        providers: [prisma_service_1.PrismaService, write_offs_service_1.WriteOffsService],
        exports: [prisma_service_1.PrismaService, write_offs_service_1.WriteOffsService],
    })
], WriteOffsModule);
//# sourceMappingURL=write-offs.module.js.map