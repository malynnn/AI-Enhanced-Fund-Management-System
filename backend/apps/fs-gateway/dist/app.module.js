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
const http_proxy_middleware_1 = require("http-proxy-middleware");
let AppModule = class AppModule {
    logger = new common_1.Logger('GatewayProxy');
    configure(consumer) {
        const ledgerSvcUrl = process.env.LEDGER_ACCOUNTS_URL || 'http://localhost:3005';
        const duesSvcUrl = process.env.DUES_COLLECTION_URL || 'http://localhost:3002';
        const disbursementSvcUrl = process.env.DISBURSEMENT_URL || 'http://localhost:3003';
        const expenseSvcUrl = process.env.EXPENSE_BUDGET_URL || 'http://localhost:3004';
        this.logger.log(`Proxy config: ledgerSvcUrl=${ledgerSvcUrl}`);
        this.logger.log(`Proxy config: duesSvcUrl=${duesSvcUrl}`);
        this.logger.log(`Proxy config: disbursementSvcUrl=${disbursementSvcUrl}`);
        this.logger.log(`Proxy config: expenseSvcUrl=${expenseSvcUrl}`);
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: ledgerSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/funds/' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/finance/funds', '/api/finance/funds/*path');
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: ledgerSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/dashboard' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/finance/dashboard');
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: duesSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/dues/' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/finance/dues', '/api/finance/dues/*path', '/api/finance/collections', '/api/finance/collections/*path');
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: disbursementSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/disbursements/' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/finance/disbursements', '/api/finance/disbursements/*path');
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: disbursementSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/loans/' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/finance/loans', '/api/finance/loans/*path');
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: disbursementSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/repayments/' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/finance/repayments', '/api/finance/repayments/*path');
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: expenseSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/vouchers/' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/finance/expense-vouchers', '/api/finance/expense-vouchers/*path');
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: expenseSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/budget-categories/' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/finance/budget-categories', '/api/finance/budget-categories/*path');
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: expenseSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/petty-cash/' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/finance/petty-cash', '/api/finance/petty-cash/*path');
        consumer
            .apply((0, http_proxy_middleware_1.createProxyMiddleware)({
            target: ledgerSvcUrl,
            changeOrigin: true,
            pathRewrite: { '^/': '/admin/' },
            on: { proxyReq: http_proxy_middleware_1.fixRequestBody },
        }))
            .forRoutes('/api/admin', '/api/admin/*path');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({})
], AppModule);
//# sourceMappingURL=app.module.js.map