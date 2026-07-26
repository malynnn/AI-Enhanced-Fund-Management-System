import sqlite3
import pandas as pd
import numpy as np
import json
import os
import sys
import traceback
import config

# ─────────────────────────────────────────────
# AFMS-011: Load Data from Analytics SQLite
# ─────────────────────────────────────────────

def load_data(db_path=None):
    """
    AFMS-011: Reads funds and transactions tables from the analytics.db SQLite database.
    Returns (funds_df, tx_df) as pandas DataFrames.
    """
    if db_path is None:
        db_path = config.ANALYTICS_DB_PATH

    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Analytics SQLite database not found at {db_path}")

    conn = sqlite3.connect(db_path)
    try:
        funds_df = pd.read_sql_query("SELECT * FROM funds", conn)
        tx_df = pd.read_sql_query("SELECT * FROM fund_transactions", conn)
    finally:
        conn.close()

    return funds_df, tx_df


# ─────────────────────────────────────────────
# AFMS-012: Clean and Preprocess Financial Records
# ─────────────────────────────────────────────

def clean_data(funds_df: pd.DataFrame, tx_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    AFMS-012: Prepares the funds and transactions datasets for analytics.
    Handles numeric conversions, datetimes, and filters out unneeded details.
    """
    funds_clean = funds_df.copy()
    tx_clean = tx_df.copy()

    # Preprocess funds
    if 'balance' in funds_clean.columns:
        funds_clean['balance'] = pd.to_numeric(funds_clean['balance'], errors='coerce').fillna(0.0)

    # Preprocess transactions
    if not tx_clean.empty:
        if 'amount' in tx_clean.columns:
            tx_clean['amount'] = pd.to_numeric(tx_clean['amount'], errors='coerce').fillna(0.0)
        
        if 'timestamp' in tx_clean.columns:
            tx_clean['timestamp'] = pd.to_datetime(tx_clean['timestamp'], errors='coerce')
            # Drop records with invalid timestamps
            tx_clean = tx_clean.dropna(subset=['timestamp'])
            # Sort chronologically
            tx_clean = tx_clean.sort_values(by='timestamp').reset_index(drop=True)

        if 'type' in tx_clean.columns:
            tx_clean['type'] = tx_clean['type'].astype(str).str.strip().str.upper()

        if 'description' in tx_clean.columns:
            tx_clean['description'] = tx_clean['description'].fillna('').astype(str).str.strip()

        if 'reference_id' in tx_clean.columns:
            tx_clean['reference_id'] = tx_clean['reference_id'].fillna('').astype(str).str.strip()

    return funds_clean, tx_clean


# ─────────────────────────────────────────────
# AFMS-013: Calculate Fund Balances & Summaries
# ─────────────────────────────────────────────

def generate_summary(funds_df: pd.DataFrame, tx_df: pd.DataFrame) -> dict:
    """
    AFMS-013: Computes current fund balances, total assets, net cash flows,
    and average transaction amounts.
    """
    total_balance = float(funds_df['balance'].sum()) if 'balance' in funds_df.columns else 0.0
    fund_balances = funds_df.set_index('id')['balance'].to_dict() if 'id' in funds_df.columns and 'balance' in funds_df.columns else {}
    fund_details = funds_df.to_dict(orient='records')

    # Basic transaction statistics
    total_tx_count = len(tx_df)
    
    if tx_df.empty:
        return {
            "total_balance": total_balance,
            "total_tx_count": 0,
            "total_deposits": 0.0,
            "total_withdrawals": 0.0,
            "total_loans": 0.0,
            "total_correcting": 0.0,
            "deposit_count": 0,
            "withdrawal_count": 0,
            "loan_count": 0,
            "correcting_count": 0,
            "avg_deposit": 0.0,
            "avg_withdrawal": 0.0,
            "avg_loan": 0.0,
            "net_flow": 0.0,
            "fund_balances": fund_balances,
            "fund_details": fund_details,
            "fund_tx_stats": {}
        }

    # Group by type
    deposits = tx_df[tx_df['type'] == 'DEPOSIT']
    withdrawals = tx_df[tx_df['type'] == 'WITHDRAWAL']
    loans = tx_df[tx_df['type'] == 'LOAN_DISBURSEMENT']
    correcting = tx_df[tx_df['type'] == 'CORRECTING_ENTRY']

    total_deposits = float(deposits['amount'].sum())
    total_withdrawals = float(withdrawals['amount'].sum())
    total_loans = float(loans['amount'].sum())
    total_correcting = float(correcting['amount'].sum())

    deposit_count = len(deposits)
    withdrawal_count = len(withdrawals)
    loan_count = len(loans)
    correcting_count = len(correcting)

    avg_deposit = float(deposits['amount'].mean()) if deposit_count > 0 else 0.0
    avg_withdrawal = float(withdrawals['amount'].mean()) if withdrawal_count > 0 else 0.0
    avg_loan = float(loans['amount'].mean()) if loan_count > 0 else 0.0

    # Net Cash Flow = Deposits - Withdrawals - Loans (and we assume correcting entry could add or subtract, let's treat as separate or ignore in basic cash flow)
    net_flow = total_deposits - total_withdrawals - total_loans

    # Compute per-fund transaction statistics
    fund_tx_stats = {}
    if 'fund_id' in tx_df.columns:
        for fund_id in funds_df['id']:
            f_tx = tx_df[tx_df['fund_id'] == fund_id]
            f_dep = f_tx[f_tx['type'] == 'DEPOSIT']['amount'].sum()
            f_wdr = f_tx[f_tx['type'] == 'WITHDRAWAL']['amount'].sum()
            f_ln = f_tx[f_tx['type'] == 'LOAN_DISBURSEMENT']['amount'].sum()
            fund_tx_stats[fund_id] = {
                "deposits": float(f_dep),
                "withdrawals": float(f_wdr),
                "loans": float(f_ln),
                "tx_count": len(f_tx)
            }

    return {
        "total_balance": total_balance,
        "total_tx_count": total_tx_count,
        "total_deposits": total_deposits,
        "total_withdrawals": total_withdrawals,
        "total_loans": total_loans,
        "total_correcting": total_correcting,
        "deposit_count": deposit_count,
        "withdrawal_count": withdrawal_count,
        "loan_count": loan_count,
        "correcting_count": correcting_count,
        "avg_deposit": avg_deposit,
        "avg_withdrawal": avg_withdrawal,
        "avg_loan": avg_loan,
        "net_flow": net_flow,
        "fund_balances": fund_balances,
        "fund_details": fund_details,
        "fund_tx_stats": fund_tx_stats
    }


# ─────────────────────────────────────────────
# AFMS-014: Analyze Financial Trends
# ─────────────────────────────────────────────

def analyze_trends(tx_df: pd.DataFrame, total_current_balance: float = 0.0) -> dict:
    """
    AFMS-014: Generates trend aggregates grouped by monthly intervals,
    and computes the daily cumulative balance path working backwards from current balance.
    """
    if tx_df.empty:
        return {
            "monthly_trends": [],
            "daily_flow": []
        }

    # Group by month (period)
    tx_dt = tx_df.copy()
    tx_dt['month'] = tx_dt['timestamp'].dt.tz_localize(None).dt.to_period('M').astype(str)

    monthly_groups = tx_dt.groupby('month')
    monthly_trends = []

    for month, group in monthly_groups:
        m_dep = group[group['type'] == 'DEPOSIT']['amount'].sum()
        m_wdr = group[group['type'] == 'WITHDRAWAL']['amount'].sum()
        m_ln = group[group['type'] == 'LOAN_DISBURSEMENT']['amount'].sum()
        m_net = m_dep - m_wdr - m_ln
        monthly_trends.append({
            "period": month,
            "deposits": float(m_dep),
            "withdrawals": float(m_wdr),
            "loans": float(m_ln),
            "net_flow": float(m_net),
            "tx_count": len(group)
        })

    # Compute historical daily running balance working backwards
    # Flow direction: DEPOSIT adds to balance, WITHDRAWAL/LOAN_DISBURSEMENT subtracts.
    tx_dt['date'] = tx_dt['timestamp'].dt.strftime('%Y-%m-%d')
    
    # Calculate net change per transaction
    def get_net_change(row):
        t = row['type']
        val = row['amount']
        if t == 'DEPOSIT':
            return val
        elif t in ('WITHDRAWAL', 'LOAN_DISBURSEMENT'):
            return -val
        elif t == 'CORRECTING_ENTRY':
            # In our db, correcting entry txn is a deduction of 500
            # Let's check description for deduction sign or treat based on description
            desc = row.get('description', '').lower()
            if 'duplicate' in desc or 'error' in desc or 'deduct' in desc:
                return -val
            return val
        return 0.0

    tx_dt['net_change'] = tx_dt.apply(get_net_change, axis=1)

    # Sort transactions chronologically
    tx_dt = tx_dt.sort_values(by='timestamp').reset_index(drop=True)
    
    # Total sum of all changes
    total_change = tx_dt['net_change'].sum()
    
    # Baseline balance before the first transaction
    baseline = total_current_balance - total_change
    
    # Calculate cumulative daily balance forward
    daily_changes = tx_dt.groupby('date')['net_change'].sum().reset_index()
    daily_changes = daily_changes.sort_values(by='date').reset_index(drop=True)
    
    daily_flow = []
    running_balance = baseline
    for _, row in daily_changes.iterrows():
        running_balance += row['net_change']
        daily_flow.append({
            "date": row['date'],
            "net_change": float(row['net_change']),
            "cumulative": float(running_balance)
        })

    return {
        "monthly_trends": monthly_trends,
        "daily_flow": daily_flow
    }


# ─────────────────────────────────────────────
# AFMS-015: Save Reports to File
# ─────────────────────────────────────────────

def save_reports(summary_data: dict, trend_data: dict, output_path: str = None) -> str:
    """
    AFMS-015: Saves compiled analytical report data to a JSON file.
    Returns the file path.
    """
    if output_path is None:
        output_path = config.ANALYTICS_REPORT_PATH

    report = {
        "generated_at": pd.Timestamp.now().strftime('%Y-%m-%dT%H:%M:%SZ'),
        "summary": summary_data,
        "trends": trend_data
    }

    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)

    return output_path


# ─────────────────────────────────────────────
# CLI Execution Pipeline (AFMS-016)
# ─────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Analytics Engine - AI Forecasting Fund Management")
    parser.add_argument("--db-path", type=str, help="Overriding path to SQLite analytics.db")
    parser.add_argument("--output-path", type=str, help="Overriding path to save analytics_report.json")
    args = parser.parse_args()

    db_path = args.db_path or os.environ.get("ANALYTICS_DB_PATH", config.ANALYTICS_DB_PATH)
    output_path = args.output_path or os.environ.get("ANALYTICS_REPORT_PATH", config.ANALYTICS_REPORT_PATH)

    result = {
        "success": False,
        "message": "",
        "report_saved_at": None,
        "data": {}
    }

    try:
        # AFMS-011: Retrieve records from SQLite
        funds_df, tx_df = load_data(db_path)

        # AFMS-012: Clean and preprocess records
        funds_clean, tx_clean = clean_data(funds_df, tx_df)

        # AFMS-013: Calculate balances and summaries
        summary = generate_summary(funds_clean, tx_clean)

        # AFMS-014: Generate trend analysis
        trends = analyze_trends(tx_clean, total_current_balance=summary["total_balance"])

        # AFMS-015: Save aggregated reports
        saved_file = save_reports(summary, trends, output_path)

        result["success"] = True
        result["message"] = "Financial analytics compiled and saved successfully."
        result["report_saved_at"] = saved_file
        result["data"] = {
            "summary": summary,
            "trends": trends
        }
        
        # Output JSON result to stdout
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        result["success"] = False
        result["message"] = f"Analytics calculation failed: {str(e)}"
        result["error_details"] = traceback.format_exc()
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
