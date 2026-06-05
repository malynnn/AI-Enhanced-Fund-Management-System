-- CreateTable
CREATE TABLE "disbursement_requests" (
    "id" TEXT NOT NULL,
    "loan_reference" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_method" TEXT NOT NULL,
    "bank_account" TEXT NOT NULL,
    "payment_details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
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
    "amount" DOUBLE PRECISION NOT NULL,
    "principal_amount" DOUBLE PRECISION NOT NULL,
    "service_fee_amount" DOUBLE PRECISION NOT NULL,
    "overpayment_amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "payment_method" TEXT NOT NULL,
    "reference_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "treasurerDecision" TEXT NOT NULL DEFAULT 'NONE',
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
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
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
    "amount_paid" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "reference_number" TEXT,
    "fund_to_credit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dues_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fund" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disbursement_requests_loan_reference_key" ON "disbursement_requests"("loan_reference");

-- CreateIndex
CREATE UNIQUE INDEX "loan_write_offs_loan_reference_key" ON "loan_write_offs"("loan_reference");

-- CreateIndex
CREATE UNIQUE INDEX "dues_records_transaction_id_key" ON "dues_records"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "chart_of_accounts"("code");

-- AddForeignKey
ALTER TABLE "disbursement_requests" ADD CONSTRAINT "disbursement_requests_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
