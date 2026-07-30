import sqlite3
import pandas as pd
import json
import datetime
import uuid
import config

# ─────────────────────────────────────────────
# AFMS-006 & AFMS-023: Create Analytics SQLite Database Tables
# ─────────────────────────────────────────────

FUNDS_DDL = """
CREATE TABLE IF NOT EXISTS funds (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    code        TEXT    NOT NULL,
    balance     REAL    NOT NULL
);
"""

TRANSACTIONS_DDL = """
CREATE TABLE IF NOT EXISTS fund_transactions (
    id              TEXT    PRIMARY KEY,
    fund_id         TEXT    NOT NULL,
    amount          REAL    NOT NULL,
    type            TEXT    NOT NULL,
    timestamp       TEXT    NOT NULL,
    description     TEXT,
    reference_id    TEXT,
    FOREIGN KEY (fund_id) REFERENCES funds(id)
);
"""

FORECAST_RESULTS_DDL = """
CREATE TABLE IF NOT EXISTS forecast_results (
    id                      TEXT    PRIMARY KEY,
    fund_id                 TEXT    NOT NULL,
    fund_name               TEXT    NOT NULL,
    code                    TEXT    NOT NULL,
    current_balance         REAL    NOT NULL,
    projected_balance_60d   REAL    NOT NULL,
    net_change              REAL    NOT NULL,
    percent_change          REAL    NOT NULL,
    trend                   TEXT    NOT NULL,
    confidence              REAL    NOT NULL,
    lower_bound             REAL    NOT NULL,
    upper_bound             REAL    NOT NULL,
    created_at              TEXT    NOT NULL,
    FOREIGN KEY (fund_id) REFERENCES funds(id)
);
"""

RECOMMENDATION_REPORTS_DDL = """
CREATE TABLE IF NOT EXISTS recommendation_reports (
    report_id           TEXT    PRIMARY KEY,
    title               TEXT    NOT NULL,
    generated_at        TEXT    NOT NULL,
    executive_summary   TEXT,
    total_reallocation  REAL    NOT NULL DEFAULT 0.0,
    created_at          TEXT    NOT NULL
);
"""

RECOMMENDATIONS_DDL = """
CREATE TABLE IF NOT EXISTS recommendations (
    id                  TEXT    PRIMARY KEY,
    report_id           TEXT,
    type                TEXT    NOT NULL,
    title               TEXT    NOT NULL,
    description         TEXT    NOT NULL,
    source_fund_id      TEXT,
    source_fund_name    TEXT,
    target_fund_id      TEXT,
    target_fund_name    TEXT,
    recommended_amount  REAL    NOT NULL DEFAULT 0.0,
    confidence          REAL    NOT NULL DEFAULT 0.0,
    timestamp           TEXT    NOT NULL,
    status              TEXT    DEFAULT 'PROPOSED',
    created_at          TEXT    NOT NULL,
    FOREIGN KEY (report_id) REFERENCES recommendation_reports(report_id)
);
"""

AUDIT_LOGS_DDL = """
CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT    PRIMARY KEY,
    action      TEXT    NOT NULL,
    actor       TEXT    NOT NULL,
    status      TEXT    NOT NULL,
    details     TEXT,
    timestamp   TEXT    NOT NULL,
    created_at  TEXT    NOT NULL
);
"""


def init_db(db_path=None):
    """
    AFMS-006 & AFMS-023: Creates the analytics SQLite database and required tables
    (funds, fund_transactions, forecast_results, recommendation_reports,
    recommendations, audit_logs) if they do not already exist.
    Returns the db_path used.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(FUNDS_DDL)
    cur.execute(TRANSACTIONS_DDL)
    cur.execute(FORECAST_RESULTS_DDL)
    cur.execute(RECOMMENDATION_REPORTS_DDL)
    cur.execute(RECOMMENDATIONS_DDL)
    cur.execute(AUDIT_LOGS_DDL)
    conn.commit()
    conn.close()
    return db_path


# ─────────────────────────────────────────────
# AFMS-007: Store Validated Funds & Transactions
# ─────────────────────────────────────────────

def store_validated_data(funds_df: pd.DataFrame, tx_df: pd.DataFrame, db_path=None):
    """
    AFMS-007: Inserts cleaned and validated Pandas DataFrames into the
    Analytics SQLite database.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    init_db(db_path)
    conn = sqlite3.connect(db_path)

    # Funds
    funds_cols = ['id', 'name', 'code', 'balance']
    available_funds_cols = [c for c in funds_cols if c in funds_df.columns]
    funds_to_store = funds_df[available_funds_cols].copy()

    funds_to_store.to_sql(
        'funds',
        conn,
        if_exists='replace',
        index=False
    )
    funds_inserted = len(funds_to_store)

    # Transactions
    tx_cols = ['id', 'fund_id', 'amount', 'type', 'timestamp', 'description', 'reference_id']
    tx_to_store = tx_df.copy()
    if 'timestamp_str' in tx_to_store.columns:
        tx_to_store['timestamp'] = tx_to_store['timestamp_str']
    elif pd.api.types.is_datetime64_any_dtype(tx_to_store.get('timestamp', pd.Series())):
        tx_to_store['timestamp'] = tx_to_store['timestamp'].dt.strftime('%Y-%m-%dT%H:%M:%SZ')

    available_tx_cols = [c for c in tx_cols if c in tx_to_store.columns]
    tx_to_store = tx_to_store[available_tx_cols]

    tx_to_store.to_sql(
        'fund_transactions',
        conn,
        if_exists='replace',
        index=False
    )
    tx_inserted = len(tx_to_store)

    conn.close()
    return funds_inserted, tx_inserted


# ─────────────────────────────────────────────
# AFMS-024: Store Forecast Results
# ─────────────────────────────────────────────

def store_forecast_results(forecasts: list, db_path=None) -> int:
    """
    AFMS-024: Stores 60-day projected forecast records into SQLite table 'forecast_results'.
    Returns number of forecast records stored.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    init_db(db_path)
    if not forecasts:
        return 0

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    count = 0
    for fc in forecasts:
        rec_id = f"FCST-{fc.get('fund_id')}-{str(uuid.uuid4())[:6]}"
        cur.execute("""
            INSERT OR REPLACE INTO forecast_results (
                id, fund_id, fund_name, code, current_balance, projected_balance_60d,
                net_change, percent_change, trend, confidence, lower_bound, upper_bound, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rec_id,
            fc.get("fund_id", ""),
            fc.get("fund_name", fc.get("fund", "")),
            fc.get("code", ""),
            float(fc.get("current_balance", 0.0)),
            float(fc.get("projected_balance_60d", fc.get("projected_balance", 0.0))),
            float(fc.get("net_change", 0.0)),
            float(fc.get("percent_change", 0.0)),
            str(fc.get("trend", "stable")),
            float(fc.get("confidence", 0.0)),
            float(fc.get("lower_bound", 0.0)),
            float(fc.get("upper_bound", 0.0)),
            now_str
        ))
        count += 1

    conn.commit()
    conn.close()
    return count


# ─────────────────────────────────────────────
# AFMS-025: Store Recommendation Reports & Recommendations
# ─────────────────────────────────────────────

def store_recommendation_reports(reallocation_report: dict, recommendations: list, db_path=None) -> tuple[int, int]:
    """
    AFMS-025: Stores recommendation report executive summary and itemized recommendations
    into SQLite tables 'recommendation_reports' and 'recommendations'.
    Returns (reports_stored, recommendations_stored).
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    init_db(db_path)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    reports_stored = 0
    recs_stored = 0

    report_id = reallocation_report.get("report_id", f"REP-REAL-{str(uuid.uuid4())[:8].upper()}")
    title = reallocation_report.get("title", "Fund Reallocation Report")
    generated_at = reallocation_report.get("generated_at", now_str)
    exec_summary = json.dumps(reallocation_report.get("executive_summary", {}))
    total_reallocation = float(reallocation_report.get("executive_summary", {}).get("total_reallocation_recommended", 0.0))

    cur.execute("""
        INSERT OR REPLACE INTO recommendation_reports (
            report_id, title, generated_at, executive_summary, total_reallocation, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (report_id, title, generated_at, exec_summary, total_reallocation, now_str))
    reports_stored = 1

    for rec in recommendations:
        rec_id = rec.get("id", f"REC-{str(uuid.uuid4())[:6]}")
        cur.execute("""
            INSERT OR REPLACE INTO recommendations (
                id, report_id, type, title, description, source_fund_id, source_fund_name,
                target_fund_id, target_fund_name, recommended_amount, confidence, timestamp, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rec_id,
            report_id,
            str(rec.get("type", "insight")),
            str(rec.get("title", "")),
            str(rec.get("description", "")),
            str(rec.get("source_fund_id", "")),
            str(rec.get("source_fund_name", "")),
            str(rec.get("target_fund_id", "")),
            str(rec.get("target_fund_name", "")),
            float(rec.get("recommended_amount", 0.0)),
            float(rec.get("confidence", 0.0)),
            str(rec.get("timestamp", now_str)),
            str(rec.get("status", "PROPOSED")),
            now_str
        ))
        recs_stored += 1

    conn.commit()
    conn.close()
    return reports_stored, recs_stored


# ─────────────────────────────────────────────
# AFMS-026: Store Audit Logs & Processing History
# ─────────────────────────────────────────────

def store_audit_logs(audit_logs: list, db_path=None) -> int:
    """
    AFMS-026: Inserts audit log entries into SQLite table 'audit_logs' without data loss.
    Returns count of stored audit logs.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    init_db(db_path)
    if not audit_logs:
        return 0

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    count = 0
    for log in audit_logs:
        log_id = log.get("id", f"LOG-{str(uuid.uuid4())[:6]}")
        details = json.dumps(log.get("details", {})) if isinstance(log.get("details"), dict) else str(log.get("details", ""))
        cur.execute("""
            INSERT OR REPLACE INTO audit_logs (
                id, action, actor, status, details, timestamp, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            log_id,
            str(log.get("action", "Analytics Processing")),
            str(log.get("actor", "System")),
            str(log.get("status", "success")),
            details,
            str(log.get("timestamp", now_str)),
            now_str
        ))
        count += 1

    conn.commit()
    conn.close()
    return count


# ─────────────────────────────────────────────
# AFMS-027: Query & Retrieve Stored Analytics
# ─────────────────────────────────────────────

def query_stored_data(db_path=None):
    """
    Utility: reads back funds and fund_transactions tables from analytics.db as DataFrames.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    init_db(db_path)
    conn = sqlite3.connect(db_path)
    funds_df = pd.read_sql_query("SELECT * FROM funds", conn)
    tx_df    = pd.read_sql_query("SELECT * FROM fund_transactions", conn)
    conn.close()
    return funds_df, tx_df


def get_stored_forecasts(db_path=None) -> list:
    """
    AFMS-027: Retrieves saved forecast records from SQLite table 'forecast_results'.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    init_db(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM forecast_results ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_stored_recommendations(db_path=None) -> list:
    """
    AFMS-027: Retrieves saved recommendations from SQLite table 'recommendations'.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    init_db(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM recommendations ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_stored_reallocation_reports(db_path=None) -> list:
    """
    AFMS-027: Retrieves saved recommendation reports from SQLite table 'recommendation_reports'.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    init_db(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM recommendation_reports ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()

    reports = []
    for r in rows:
        r_dict = dict(r)
        if r_dict.get("executive_summary"):
            try:
                r_dict["executive_summary"] = json.loads(r_dict["executive_summary"])
            except Exception:
                pass
        reports.append(r_dict)
    return reports


def get_stored_audit_logs(db_path=None) -> list:
    """
    AFMS-027: Retrieves saved audit logs from SQLite table 'audit_logs'.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    init_db(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM audit_logs ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
