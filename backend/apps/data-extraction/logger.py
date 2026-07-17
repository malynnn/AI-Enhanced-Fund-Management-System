import json
import os
from datetime import datetime, timezone
import config

# ─────────────────────────────────────────────
# AFMS-008: Extraction Activity Logger
# ─────────────────────────────────────────────

def log_extraction(
    source: str,
    funds_stats: dict,
    tx_stats: dict,
    success: bool,
    message: str,
    security_verified: bool = None,
    log_path: str = None
):
    """
    AFMS-008: Appends a structured log entry to the extraction log file
    (extraction_log.json). Each entry records the execution timestamp,
    data source, record counts, validation stats, security status, and
    overall result. This allows every extraction activity to be monitored
    and reviewed.

    Parameters:
        source            - 'db' or 'csv'
        funds_stats       - dict returned by validate_funds()
        tx_stats          - dict returned by validate_transactions()
        success           - True if extraction completed without error
        message           - Human-readable summary message
        security_verified - True/False/None (None = N/A for CSV source)
        log_path          - Override path; defaults to config.EXTRACTION_LOG_PATH
    """
    if log_path is None:
        log_path = config.EXTRACTION_LOG_PATH

    entry = {
        "timestamp":          datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        "source":             source,
        "success":            success,
        "message":            message,
        "security_verified":  security_verified,
        "funds": {
            "initial_count":  funds_stats.get("initial_count", 0),
            "final_count":    funds_stats.get("final_count", 0),
            "dropped":        funds_stats.get("total_dropped", 0),
            "drop_reasons":   funds_stats.get("drop_reasons", {}),
        },
        "transactions": {
            "initial_count":  tx_stats.get("initial_count", 0),
            "final_count":    tx_stats.get("final_count", 0),
            "dropped":        tx_stats.get("total_dropped", 0),
            "drop_reasons":   tx_stats.get("drop_reasons", {}),
        }
    }

    # Load existing log array or start fresh
    if os.path.exists(log_path):
        try:
            with open(log_path, "r", encoding="utf-8") as f:
                log_data = json.load(f)
            if not isinstance(log_data, list):
                log_data = []
        except (json.JSONDecodeError, IOError):
            log_data = []
    else:
        log_data = []

    log_data.append(entry)

    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)

    return entry


def read_log(log_path: str = None) -> list:
    """
    Returns all log entries from the extraction log file as a list of dicts.
    Returns an empty list if the log file does not exist or is malformed.
    """
    if log_path is None:
        log_path = config.EXTRACTION_LOG_PATH

    if not os.path.exists(log_path):
        return []
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def log_failure(source: str, error_message: str, log_path: str = None):
    """
    Convenience wrapper to log a failed extraction run where
    validation stats may not be available.
    """
    empty_stats = {"initial_count": 0, "final_count": 0, "total_dropped": 0, "drop_reasons": {}}
    return log_extraction(
        source=source,
        funds_stats=empty_stats,
        tx_stats=empty_stats,
        success=False,
        message=error_message,
        log_path=log_path
    )
