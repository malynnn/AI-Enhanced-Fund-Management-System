import sqlite3
import pandas as pd
import config

# ─────────────────────────────────────────────
# AFMS-006: Create Analytics SQLite Database
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

def init_db(db_path=None):
    """
    AFMS-006: Creates the analytics SQLite database and required tables
    (funds, fund_transactions) if they do not already exist.
    Returns the db_path used.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(FUNDS_DDL)
    cur.execute(TRANSACTIONS_DDL)
    conn.commit()
    conn.close()
    return db_path


# ─────────────────────────────────────────────
# AFMS-007: Store Validated Data into SQLite
# ─────────────────────────────────────────────

def store_validated_data(funds_df: pd.DataFrame, tx_df: pd.DataFrame, db_path=None):
    """
    AFMS-007: Inserts cleaned and validated Pandas DataFrames into the
    Analytics SQLite database. Existing rows with the same primary key
    are replaced to allow re-runs without duplication.
    Returns (funds_inserted, tx_inserted) counts.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    # Ensure the database and tables exist
    init_db(db_path)

    conn = sqlite3.connect(db_path)

    # ── Funds ──
    funds_cols = ['id', 'name', 'code', 'balance']
    available_funds_cols = [c for c in funds_cols if c in funds_df.columns]
    funds_to_store = funds_df[available_funds_cols].copy()

    funds_to_store.to_sql(
        'funds',
        conn,
        if_exists='replace',   # full replace so re-runs are idempotent
        index=False
    )
    funds_inserted = len(funds_to_store)

    # ── Transactions ──
    tx_cols = ['id', 'fund_id', 'amount', 'type', 'timestamp', 'description', 'reference_id']

    # timestamp may be a Timestamp object; convert to ISO string for SQLite
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


def query_stored_data(db_path=None):
    """
    Utility: reads back both tables from analytics.db and returns them as DataFrames.
    Useful for verification and testing.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    conn = sqlite3.connect(db_path)
    funds_df = pd.read_sql_query("SELECT * FROM funds", conn)
    tx_df    = pd.read_sql_query("SELECT * FROM fund_transactions", conn)
    conn.close()
    return funds_df, tx_df
