-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fs_audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action_type" TEXT NOT NULL,
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
    "role" TEXT NOT NULL,
    "digital_sig" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_signoffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "fs_audit_log" ADD CONSTRAINT "fs_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_signoffs" ADD CONSTRAINT "report_signoffs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trigger function to prevent UPDATE or DELETE
CREATE OR REPLACE FUNCTION forbid_update_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Updates are not allowed on the % table.', TG_TABLE_NAME;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Deletes are not allowed on the % table.', TG_TABLE_NAME;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists to avoid errors on multiple runs
DROP TRIGGER IF EXISTS trg_forbid_update_delete ON fs_audit_log;

-- Create the trigger on the fs_audit_log table
CREATE TRIGGER trg_forbid_update_delete
BEFORE UPDATE OR DELETE ON fs_audit_log
FOR EACH ROW
EXECUTE FUNCTION forbid_update_delete();
