import argparse
import sys
import json
import traceback
import config
import db_connection
import extractor
import validator

def main():
    parser = argparse.ArgumentParser(description="Data Extraction Module - AI Forecasting Fund Management")
    parser.add_argument("--source", type=str, choices=["db", "csv"], default="db", help="Data source: 'db' or 'csv'")
    parser.add_argument("--funds-csv", type=str, help="Path to funds CSV file (required if source is csv)")
    parser.add_argument("--tx-csv", type=str, help="Path to transactions CSV file (required if source is csv)")
    parser.add_argument("--setup-db", action="store_true", help="Set up the secure read-only database user")
    parser.add_argument("--verify-security", action="store_true", help="Verify the secure read-only permission check")
    
    # Optional DB overrides
    parser.add_argument("--host", type=str, help="Database host override")
    parser.add_argument("--port", type=str, help="Database port override")
    parser.add_argument("--database", type=str, help="Database name override")
    parser.add_argument("--user", type=str, help="Read-only user override")
    parser.add_argument("--password", type=str, help="Read-only password override")
    
    args = parser.parse_args()

    # Apply overrides if provided
    if args.host: config.DB_HOST = args.host
    if args.port: config.DB_PORT = args.port
    if args.database: config.DB_NAME = args.database
    if args.user: config.DB_RO_USER = args.user
    if args.password: config.DB_RO_PASSWORD = args.password

    result = {
        "success": False,
        "message": "",
        "security_check": None,
        "stats": {},
        "data": {}
    }

    try:
        # Handle Setup DB Flag
        if args.setup_db:
            setup_success, msg = db_connection.setup_readonly_user()
            if not setup_success:
                result["message"] = msg
                print(json.dumps(result))
                sys.exit(1)
            result["message"] = msg
            
        # Handle Verify Security Flag
        if args.verify_security:
            is_secure, msg = db_connection.verify_readonly_security()
            result["success"] = is_secure
            result["message"] = msg
            result["security_check"] = {"verified": is_secure, "message": msg}
            print(json.dumps(result))
            sys.exit(0 if is_secure else 1)

        # Normal extraction workflow
        security_verified = False
        security_msg = ""
        
        # 1. Extraction from source
        if args.source == "db":
            # Set up user automatically if database source is selected
            db_connection.setup_readonly_user()
            
            # Run security verification
            security_verified, security_msg = db_connection.verify_readonly_security()
            
            funds_df, tx_df = extractor.extract_from_db()
        else:
            if not args.funds_csv or not args.tx_csv:
                raise ValueError("Both --funds-csv and --tx-csv arguments are required when source is 'csv'")
            
            funds_df, tx_df = extractor.extract_from_csv(args.funds_csv, args.tx_csv)
            security_verified = True
            security_msg = "Skipped (CSV source does not use database permissions)"

        # 2. Validation and Cleaning
        clean_funds_df, funds_stats = validator.validate_funds(funds_df)
        clean_tx_df, tx_stats = validator.validate_transactions(tx_df)

        # 3. Populate Results
        result["success"] = True
        result["message"] = "Data extraction and cleaning completed successfully."
        result["security_check"] = {"verified": security_verified, "message": security_msg}
        result["stats"] = {
            "funds": funds_stats,
            "transactions": tx_stats
        }
        
        # Convert DataFrames to JSON dictionary records
        # Keep only basic fields for the frontend
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
            # If timestamp_str was added by validator, use it
            if 'timestamp_str' in cleaned:
                cleaned['timestamp'] = cleaned['timestamp_str']
                del cleaned['timestamp_str']
            return cleaned

        funds_list = [clean_record(r) for r in clean_funds_df.to_dict(orient="records")]
        tx_list = [clean_record(r) for r in clean_tx_df.to_dict(orient="records")]

        result["data"] = {
            "funds": funds_list,
            "transactions": tx_list
        }
        
        # Output JSON result
        print(json.dumps(result))

    except Exception as e:
        result["success"] = False
        result["message"] = f"Extraction failed: {str(e)}"
        result["error_details"] = traceback.format_exc()
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
