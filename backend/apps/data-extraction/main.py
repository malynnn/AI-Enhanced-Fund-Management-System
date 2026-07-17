import argparse
import sys
import json
import traceback
import config
import db_connection
import extractor
import validator
import analytics_store   # AFMS-006 / AFMS-007
import logger            # AFMS-008

def main():
    parser = argparse.ArgumentParser(description="Data Extraction Module - AI Forecasting Fund Management")
    parser.add_argument("--source", type=str, choices=["db", "csv"], default="db", help="Data source: 'db' or 'csv'")
    parser.add_argument("--funds-csv", type=str, help="Path to funds CSV file (required if source is csv)")
    parser.add_argument("--tx-csv", type=str, help="Path to transactions CSV file (required if source is csv)")
    parser.add_argument("--setup-db", action="store_true", help="Set up the secure read-only database user")
    parser.add_argument("--verify-security", action="store_true", help="Verify the secure read-only permission check")

    # Optional DB overrides
    parser.add_argument("--host",     type=str, help="Database host override")
    parser.add_argument("--port",     type=str, help="Database port override")
    parser.add_argument("--database", type=str, help="Database name override")
    parser.add_argument("--user",     type=str, help="Read-only user override")
    parser.add_argument("--password", type=str, help="Read-only password override")

    args = parser.parse_args()

    # Apply overrides if provided
    if args.host:     config.DB_HOST        = args.host
    if args.port:     config.DB_PORT        = args.port
    if args.database: config.DB_NAME        = args.database
    if args.user:     config.DB_RO_USER     = args.user
    if args.password: config.DB_RO_PASSWORD = args.password

    result = {
        "success":          False,
        "message":          "",
        "security_check":   None,
        "integrity_check":  None,   # AFMS-009
        "stats":            {},
        "sqlite_stored":    None,   # AFMS-006/007
        "log_entry":        None,   # AFMS-008
        "data":             {}
    }

    source = args.source

    try:
        # ── Handle Setup DB Flag ──────────────────────────────
        if args.setup_db:
            setup_success, msg = db_connection.setup_readonly_user()
            if not setup_success:
                result["message"] = msg
                print(json.dumps(result))
                sys.exit(1)
            result["message"] = msg

        # ── Handle Verify Security Flag ───────────────────────
        if args.verify_security:
            is_secure, msg = db_connection.verify_readonly_security()
            result["success"]        = is_secure
            result["message"]        = msg
            result["security_check"] = {"verified": is_secure, "message": msg}
            print(json.dumps(result))
            sys.exit(0 if is_secure else 1)

        # ── Step 1: Extract from Source ───────────────────────
        security_verified = False
        security_msg      = ""

        if source == "db":
            # Set up read-only user automatically
            db_connection.setup_readonly_user()
            # Run security verification (AFMS-001)
            security_verified, security_msg = db_connection.verify_readonly_security()
            # Extract records (AFMS-002)
            funds_df, tx_df = extractor.extract_from_db()
        else:
            if not args.funds_csv or not args.tx_csv:
                raise ValueError("Both --funds-csv and --tx-csv arguments are required when source is 'csv'")
            # Extract from CSV (AFMS-003)
            funds_df, tx_df = extractor.extract_from_csv(args.funds_csv, args.tx_csv)
            security_verified = True
            security_msg = "Skipped (CSV source does not use database permissions)"

        # Keep raw copies for integrity check (AFMS-009)
        raw_funds_df = funds_df.copy()
        raw_tx_df    = tx_df.copy()

        # ── Step 2: Validate & Clean (AFMS-004 / AFMS-005) ───
        clean_funds_df, funds_stats = validator.validate_funds(funds_df)
        clean_tx_df, tx_stats       = validator.validate_transactions(tx_df)

        # ── Step 3: Record Integrity Verification (AFMS-009) ──
        funds_integrity = validator.verify_record_integrity(
            raw_df=raw_funds_df,
            clean_df=clean_funds_df,
            required_cols=['id', 'name', 'code', 'balance'],
            label='funds'
        )
        tx_integrity = validator.verify_record_integrity(
            raw_df=raw_tx_df,
            clean_df=clean_tx_df,
            required_cols=['id', 'fund_id', 'amount', 'type', 'timestamp'],
            label='transactions'
        )
        integrity_passed = funds_integrity["passed"] and tx_integrity["passed"]

        result["integrity_check"] = {
            "passed":       integrity_passed,
            "funds":        funds_integrity,
            "transactions": tx_integrity,
        }

        # ── Step 4: Store to Analytics SQLite (AFMS-006/007) ──
        try:
            funds_stored, tx_stored = analytics_store.store_validated_data(
                clean_funds_df, clean_tx_df
            )
            result["sqlite_stored"] = {
                "db_path":       config.ANALYTICS_DB_PATH,
                "funds_stored":  funds_stored,
                "tx_stored":     tx_stored,
            }
        except Exception as sqlite_err:
            result["sqlite_stored"] = {
                "error": f"SQLite storage failed: {str(sqlite_err)}"
            }

        # ── Step 5: Populate Result ────────────────────────────
        result["success"] = True
        result["message"] = "Data extraction, validation, and storage completed successfully."
        result["security_check"] = {"verified": security_verified, "message": security_msg}
        result["stats"] = {
            "funds":        funds_stats,
            "transactions": tx_stats,
        }

        # Serialize DataFrames → JSON-safe dicts
        import pandas as pd
        import datetime
        import decimal

        def clean_record(rec):
            cleaned = {}
            for k, v in rec.items():
                if isinstance(v, (pd.Timestamp, datetime.datetime, datetime.date)):
                    cleaned[k] = v.isoformat()
                elif isinstance(v, decimal.Decimal):
                    cleaned[k] = float(v)
                elif isinstance(v, float) and (v != v or v == float('inf') or v == float('-inf')):
                    cleaned[k] = None
                else:
                    cleaned[k] = v
            # Replace raw Timestamp column with the pre-formatted string if present
            if 'timestamp_str' in cleaned:
                cleaned['timestamp'] = cleaned['timestamp_str']
                del cleaned['timestamp_str']
            return cleaned

        funds_list = [clean_record(r) for r in clean_funds_df.to_dict(orient="records")]
        tx_list    = [clean_record(r) for r in clean_tx_df.to_dict(orient="records")]

        result["data"] = {
            "funds":        funds_list,
            "transactions": tx_list,
        }

        # ── Step 6: Write Extraction Log (AFMS-008) ───────────
        log_entry = logger.log_extraction(
            source=source,
            funds_stats=funds_stats,
            tx_stats=tx_stats,
            success=True,
            message=result["message"],
            security_verified=security_verified,
        )
        result["log_entry"] = log_entry

        print(json.dumps(result))

    except Exception as e:
        err_msg = f"Extraction failed: {str(e)}"

        # Log failure (AFMS-008) — even failed runs are logged
        try:
            logger.log_failure(source=source, error_message=err_msg)
        except Exception:
            pass  # never let logger crash break the error output

        result["success"]       = False
        result["message"]       = err_msg
        result["error_details"] = traceback.format_exc()
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
