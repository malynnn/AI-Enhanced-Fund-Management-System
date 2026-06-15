import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

@Module({})
export class AppModule implements NestModule {
  private readonly logger = new Logger('GatewayProxy');

  configure(consumer: MiddlewareConsumer) {
    const ledgerSvcUrl = process.env.LEDGER_ACCOUNTS_URL || 'http://localhost:3005';
    const duesSvcUrl = process.env.DUES_COLLECTION_URL || 'http://localhost:3002';
    const disbursementSvcUrl = process.env.DISBURSEMENT_URL || 'http://localhost:3003';
    const expenseSvcUrl = process.env.EXPENSE_BUDGET_URL || 'http://localhost:3004';

    // Log the configured proxy URLs for debug purposes
    this.logger.log(`Proxy config: ledgerSvcUrl=${ledgerSvcUrl}`);
    this.logger.log(`Proxy config: duesSvcUrl=${duesSvcUrl}`);
    this.logger.log(`Proxy config: disbursementSvcUrl=${disbursementSvcUrl}`);
    this.logger.log(`Proxy config: expenseSvcUrl=${expenseSvcUrl}`);

    // ledger-accounts-svc (Accounts)
    consumer
      .apply(
        createProxyMiddleware({
          target: ledgerSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/accounts/' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/accounts', '/api/finance/accounts/*path');

    // ledger-accounts-svc (Funds)
    consumer
      .apply(
        createProxyMiddleware({
          target: ledgerSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/funds/' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/funds', '/api/finance/funds/*path');

    // ledger-accounts-svc (Dashboard)
    consumer
      .apply(
        createProxyMiddleware({
          target: ledgerSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/dashboard' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/dashboard');

    // dues-collection-svc
    consumer
      .apply(
        createProxyMiddleware({
          target: duesSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/dues/' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/dues', '/api/finance/dues/*path');

    // disbursement-svc (Disbursements)
    consumer
      .apply(
        createProxyMiddleware({
          target: disbursementSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/disbursements/' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/disbursements', '/api/finance/disbursements/*path');

    // disbursement-svc (Loans)
    consumer
      .apply(
        createProxyMiddleware({
          target: disbursementSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/loans/' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/loans', '/api/finance/loans/*path');

    // disbursement-svc (Repayments)
    consumer
      .apply(
        createProxyMiddleware({
          target: disbursementSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/repayments/' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/repayments', '/api/finance/repayments/*path');

    // expense-budget-svc (Expense Vouchers) -> maps to /vouchers
    consumer
      .apply(
        createProxyMiddleware({
          target: expenseSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/vouchers/' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/expense-vouchers', '/api/finance/expense-vouchers/*path');

    // expense-budget-svc (Budget Categories) -> maps to /budget-categories
    consumer
      .apply(
        createProxyMiddleware({
          target: expenseSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/budget-categories/' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/budget-categories', '/api/finance/budget-categories/*path');

    // expense-budget-svc (Petty Cash) -> maps to /petty-cash
    consumer
      .apply(
        createProxyMiddleware({
          target: expenseSvcUrl,
          changeOrigin: true,
          pathRewrite: { '^/': '/petty-cash/' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes('/api/finance/petty-cash', '/api/finance/petty-cash/*path');
  }
}

