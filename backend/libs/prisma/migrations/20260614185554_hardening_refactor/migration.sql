-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('USER', 'ADMIN', 'TREASURER', 'PRESIDENT');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('POST', 'PUT', 'DELETE');

-- CreateEnum
CREATE TYPE "FundTxType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'LOAN_DISBURSEMENT', 'CORRECTING_ENTRY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CHECK', 'CASH', 'SALARY_DEDUCTION');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RepaymentStatus" AS ENUM ('PROCESSED', 'OVERPAYMENT_PENDING', 'OVERPAYMENT_CREDITED', 'OVERPAYMENT_REFUNDED');

-- CreateEnum
CREATE TYPE "TreasurerDecision" AS ENUM ('NONE', 'ADVANCE_CREDIT', 'REFUND');

-- CreateEnum
CREATE TYPE "WriteOffStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DuesStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Asset', 'Liability', 'Equity', 'Income', 'Expense');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('Active', 'Inactive', 'Archived', 'Deleted');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'POSTED');

-- CreateEnum
CREATE TYPE "PettyCashType" AS ENUM ('REPLENISHMENT', 'DISBURSEMENT', 'OPENING_BALANCE', 'RECONCILIATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fs_audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action_type" "ActionType" NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "old_value_json" JSONB,
    "new_value_json" JSONB,
    "ip_address" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fs_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_signoffs" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL,
    "digital_sig" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_signoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_transactions" (
    "id" TEXT NOT NULL,
    "fund_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "FundTxType" NOT NULL,
    "description" TEXT NOT NULL,
    "reference_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursement_requests" (
    "id" TEXT NOT NULL,
    "loan_reference" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "bank_account" TEXT NOT NULL,
    "payment_details" TEXT,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "authorized_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "fund_id" TEXT NOT NULL,

    CONSTRAINT "disbursement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_repayments" (
    "id" TEXT NOT NULL,
    "loan_reference" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "principal_amount" DECIMAL(12,2) NOT NULL,
    "service_fee_amount" DECIMAL(12,2) NOT NULL,
    "overpayment_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "status" "RepaymentStatus" NOT NULL DEFAULT 'PROCESSED',
    "treasurerDecision" "TreasurerDecision" NOT NULL DEFAULT 'NONE',
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_repayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_write_offs" (
    "id" TEXT NOT NULL,
    "loan_reference" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "WriteOffStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT NOT NULL,
    "authorized_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_write_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dues_records" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "fund_to_credit" TEXT NOT NULL,
    "status" "DuesStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dues_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "fund" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_vouchers" (
    "id" TEXT NOT NULL,
    "voucher_number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payee" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "account_code" TEXT NOT NULL,
    "approved_by" TEXT,
    "status" "VoucherStatus" NOT NULL DEFAULT 'PENDING',
    "receipt_url" TEXT,
    "posted_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_transactions" (
    "id" TEXT NOT NULL,
    "type" "PettyCashType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "running_balance" DECIMAL(12,2) NOT NULL,
    "reference_voucher_id" TEXT,
    "transacted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petty_cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_categories" (
    "id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "approved_amount" DECIMAL(12,2) NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "funds_name_key" ON "funds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "funds_code_key" ON "funds"("code");

-- CreateIndex
CREATE INDEX "fund_transactions_fund_id_idx" ON "fund_transactions"("fund_id");

-- CreateIndex
CREATE UNIQUE INDEX "disbursement_requests_loan_reference_key" ON "disbursement_requests"("loan_reference");

-- CreateIndex
CREATE UNIQUE INDEX "loan_write_offs_loan_reference_key" ON "loan_write_offs"("loan_reference");

-- CreateIndex
CREATE UNIQUE INDEX "dues_records_transaction_id_key" ON "dues_records"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "chart_of_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "expense_vouchers_voucher_number_key" ON "expense_vouchers"("voucher_number");

-- CreateIndex
CREATE UNIQUE INDEX "budget_categories_account_code_key" ON "budget_categories"("account_code");

-- AddForeignKey
ALTER TABLE "fs_audit_log" ADD CONSTRAINT "fs_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_signoffs" ADD CONSTRAINT "report_signoffs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_requests" ADD CONSTRAINT "disbursement_requests_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_vouchers" ADD CONSTRAINT "expense_vouchers_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "chart_of_accounts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_reference_voucher_id_fkey" FOREIGN KEY ("reference_voucher_id") REFERENCES "expense_vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "chart_of_accounts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
