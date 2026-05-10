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
