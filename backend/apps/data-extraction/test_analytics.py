import unittest
import pandas as pd
import sqlite3
import tempfile
import os
import json

import config
import analytics

class TestAnalytics(unittest.TestCase):

    def setUp(self):
        # Create a temporary SQLite database for testing load_data
        self.db_fd, self.db_path = tempfile.mkstemp()
        
        # Populate the temporary DB with test data
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        
        # Create tables
        cur.execute("""
        CREATE TABLE funds (
            id          TEXT    PRIMARY KEY,
            name        TEXT    NOT NULL,
            code        TEXT    NOT NULL,
            balance     REAL    NOT NULL
        );
        """)
        cur.execute("""
        CREATE TABLE fund_transactions (
            id              TEXT    PRIMARY KEY,
            fund_id         TEXT    NOT NULL,
            amount          REAL    NOT NULL,
            type            TEXT    NOT NULL,
            timestamp       TEXT    NOT NULL,
            description     TEXT,
            reference_id    TEXT
        );
        """)
        
        # Insert funds
        cur.execute("INSERT INTO funds VALUES ('GF-001', 'General Fund', 'GF', 10000.0)")
        cur.execute("INSERT INTO funds VALUES ('UF-001', 'Union Fund', 'UF', 5000.0)")
        
        # Insert transactions
        cur.execute("INSERT INTO fund_transactions VALUES ('tx-1', 'GF-001', 2000.0, 'DEPOSIT', '2026-07-01T12:00:00Z', 'Member remittance', 'REF-01')")
        cur.execute("INSERT INTO fund_transactions VALUES ('tx-2', 'GF-001', 500.0, 'WITHDRAWAL', '2026-07-02T13:00:00Z', 'Office supplies', 'REF-02')")
        cur.execute("INSERT INTO fund_transactions VALUES ('tx-3', 'UF-001', 1000.0, 'LOAN_DISBURSEMENT', '2026-07-03T14:00:00Z', 'Disbursement', 'REF-03')")
        
        conn.commit()
        conn.close()

    def tearDown(self):
        # Close file descriptor and remove the temporary DB file
        os.close(self.db_fd)
        try:
            os.unlink(self.db_path)
        except OSError:
            pass

    def test_load_data(self):
        funds_df, tx_df = analytics.load_data(self.db_path)
        
        self.assertEqual(len(funds_df), 2)
        self.assertEqual(len(tx_df), 3)
        self.assertIn('GF-001', funds_df['id'].values)
        self.assertIn('tx-2', tx_df['id'].values)

    def test_clean_data(self):
        raw_funds = pd.DataFrame([
            {"id": "GF-001", "name": "General Fund", "code": "GF", "balance": "10000.0"},
            {"id": "UF-001", "name": "Union Fund", "code": "UF", "balance": None}
        ])
        raw_tx = pd.DataFrame([
            {"id": "tx-1", "fund_id": "GF-001", "amount": "2000.0", "type": "deposit ", "timestamp": "2026-07-01T12:00:00Z", "description": " Remittance ", "reference_id": None},
            {"id": "tx-2", "fund_id": "GF-001", "amount": "abc", "type": "WITHDRAWAL", "timestamp": "invalid_date", "description": "", "reference_id": ""}
        ])

        clean_funds, clean_tx = analytics.clean_data(raw_funds, raw_tx)
        
        # Verify funds cleaning
        self.assertEqual(clean_funds.loc[clean_funds['id'] == 'UF-001', 'balance'].values[0], 0.0)
        self.assertEqual(clean_funds.loc[clean_funds['id'] == 'GF-001', 'balance'].values[0], 10000.0)
        
        # Verify transactions cleaning
        # Row 2 should be dropped due to invalid timestamp
        self.assertEqual(len(clean_tx), 1)
        self.assertEqual(clean_tx['type'].values[0], 'DEPOSIT')
        self.assertEqual(clean_tx['description'].values[0], 'Remittance')
        self.assertEqual(clean_tx['reference_id'].values[0], '')

    def test_generate_summary(self):
        funds_df, tx_df = analytics.load_data(self.db_path)
        funds_clean, tx_clean = analytics.clean_data(funds_df, tx_df)
        
        summary = analytics.generate_summary(funds_clean, tx_clean)
        
        self.assertEqual(summary["total_balance"], 15000.0)
        self.assertEqual(summary["total_tx_count"], 3)
        self.assertEqual(summary["total_deposits"], 2000.0)
        self.assertEqual(summary["total_withdrawals"], 500.0)
        self.assertEqual(summary["total_loans"], 1000.0)
        self.assertEqual(summary["net_flow"], 500.0) # 2000 - 500 - 1000
        
        self.assertEqual(summary["fund_balances"]["GF-001"], 10000.0)
        self.assertEqual(summary["fund_tx_stats"]["GF-001"]["deposits"], 2000.0)
        self.assertEqual(summary["fund_tx_stats"]["GF-001"]["withdrawals"], 500.0)

    def test_analyze_trends(self):
        funds_df, tx_df = analytics.load_data(self.db_path)
        funds_clean, tx_clean = analytics.clean_data(funds_df, tx_df)
        
        summary = analytics.generate_summary(funds_clean, tx_clean)
        trends = analytics.analyze_trends(tx_clean, total_current_balance=summary["total_balance"])
        
        # Verify monthly trends
        self.assertEqual(len(trends["monthly_trends"]), 1)
        self.assertEqual(trends["monthly_trends"][0]["period"], "2026-07")
        self.assertEqual(trends["monthly_trends"][0]["net_flow"], 500.0)
        
        # Verify cumulative flow
        # Current balance is 15000. Total change is 500. Baseline balance = 15000 - 500 = 14500.
        # tx-1 (deposit 2000) on 2026-07-01: cumulative = 14500 + 2000 = 16500.
        # tx-2 (withdrawal 500) on 2026-07-02: cumulative = 16500 - 500 = 16000.
        # tx-3 (loan 1000) on 2026-07-03: cumulative = 16000 - 1000 = 15000 (ends at total current balance!)
        
        daily_flow = trends["daily_flow"]
        self.assertEqual(len(daily_flow), 3)
        self.assertEqual(daily_flow[0]["date"], "2026-07-01")
        self.assertEqual(daily_flow[0]["cumulative"], 16500.0)
        self.assertEqual(daily_flow[1]["date"], "2026-07-02")
        self.assertEqual(daily_flow[1]["cumulative"], 16000.0)
        self.assertEqual(daily_flow[2]["date"], "2026-07-03")
        self.assertEqual(daily_flow[2]["cumulative"], 15000.0)

    def test_save_reports(self):
        summary_data = {"test": 123}
        trend_data = {"trend": [1, 2, 3]}
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as temp_file:
            temp_path = temp_file.name
            
        try:
            saved_path = analytics.save_reports(summary_data, trend_data, temp_path)
            self.assertEqual(saved_path, temp_path)
            
            with open(temp_path, 'r') as f:
                report = json.load(f)
                
            self.assertEqual(report["summary"], summary_data)
            self.assertEqual(report["trends"], trend_data)
            self.assertIn("generated_at", report)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

if __name__ == "__main__":
    unittest.main()
