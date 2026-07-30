import argparse
import json
import os
import sys
import config
import analytics_store

def main():
    parser = argparse.ArgumentParser(description="Query Sprint 4 Stored Analytics Data from SQLite")
    parser.add_argument("--type", type=str, choices=["forecasts", "recommendations", "reports", "audit_logs", "all"], default="all", help="Data type to query")
    parser.add_argument("--db-path", type=str, help="Path to SQLite analytics.db")

    args = parser.parse_args()
    db_path = args.db_path or os.environ.get("ANALYTICS_DB_PATH", config.ANALYTICS_DB_PATH)

    try:
        data = {}
        if args.type in ("forecasts", "all"):
            data["forecasts"] = analytics_store.get_stored_forecasts(db_path)
        if args.type in ("recommendations", "all"):
            data["recommendations"] = analytics_store.get_stored_recommendations(db_path)
        if args.type in ("reports", "all"):
            data["reports"] = analytics_store.get_stored_reallocation_reports(db_path)
        if args.type in ("audit_logs", "all"):
            data["audit_logs"] = analytics_store.get_stored_audit_logs(db_path)

        result = {
            "success": True,
            "message": f"Successfully retrieved stored {args.type} from SQLite database.",
            "db_path": db_path,
            "data": data
        }
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        result = {
            "success": False,
            "message": f"Failed to retrieve stored data: {str(e)}"
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
