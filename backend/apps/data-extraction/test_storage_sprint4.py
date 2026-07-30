import unittest
import sqlite3
import tempfile
import os
import json

import analytics_store

class TestStorageSprint4(unittest.TestCase):

    def setUp(self):
        # Create a temporary SQLite database
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")

    def tearDown(self):
        os.close(self.db_fd)
        if os.path.exists(self.db_path):
            os.unlink(self.db_path)

    def test_afms_023_init_db_tables(self):
        """AFMS-023: Verify SQLite analytics database and required tables are created."""
        analytics_store.init_db(self.db_path)

        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cur.fetchall()]
        conn.close()

        expected_tables = [
            'funds',
            'fund_transactions',
            'forecast_results',
            'recommendation_reports',
            'recommendations',
            'audit_logs'
        ]
        for tbl in expected_tables:
            self.assertIn(tbl, tables, f"Table '{tbl}' should exist in SQLite database.")

    def test_afms_024_store_and_get_forecasts(self):
        """AFMS-024: Verify forecast results are stored automatically into SQLite and retrievable."""
        sample_forecasts = [
            {
                "fund_id": "GF-001",
                "fund_name": "General Fund",
                "code": "GF",
                "current_balance": 100000.0,
                "projected_balance_60d": 120000.0,
                "net_change": 20000.0,
                "percent_change": 20.0,
                "trend": "up",
                "confidence": 94.5,
                "lower_bound": 110000.0,
                "upper_bound": 130000.0
            },
            {
                "fund_id": "UF-001",
                "fund_name": "Union Fund",
                "code": "UF",
                "current_balance": 50000.0,
                "projected_balance_60d": 45000.0,
                "net_change": -5000.0,
                "percent_change": -10.0,
                "trend": "down",
                "confidence": 91.2,
                "lower_bound": 40000.0,
                "upper_bound": 50000.0
            }
        ]

        stored_count = analytics_store.store_forecast_results(sample_forecasts, db_path=self.db_path)
        self.assertEqual(stored_count, 2)

        retrieved = analytics_store.get_stored_forecasts(db_path=self.db_path)
        self.assertEqual(len(retrieved), 2)
        fund_ids = [r["fund_id"] for r in retrieved]
        self.assertIn("GF-001", fund_ids)
        self.assertIn("UF-001", fund_ids)

    def test_afms_025_store_and_get_recommendations(self):
        """AFMS-025: Verify recommendation reports and recommendations are saved and retrievable."""
        reallocation_report = {
            "report_id": "REP-REAL-2026TEST",
            "title": "Fund Reallocation & Liquidity Decision Support Report",
            "generated_at": "2026-08-02T10:00:00Z",
            "executive_summary": {
                "total_funds_analyzed": 2,
                "total_portfolio_balance": 150000.0,
                "total_60d_projected_balance": 165000.0,
                "total_reallocation_recommended": 15000.0,
                "action_required": True
            }
        }

        sample_recs = [
            {
                "id": "REC-REAL-001",
                "type": "critical",
                "title": "Fund Reallocation: Transfer from GF to UF",
                "description": "Reallocate ₱15,000 from General Fund to Union Fund.",
                "source_fund_id": "GF-001",
                "source_fund_name": "General Fund",
                "target_fund_id": "UF-001",
                "target_fund_name": "Union Fund",
                "recommended_amount": 15000.0,
                "confidence": 94.2,
                "timestamp": "2026-08-02 10:00:00",
                "status": "PROPOSED"
            }
        ]

        rep_count, rec_count = analytics_store.store_recommendation_reports(
            reallocation_report, sample_recs, db_path=self.db_path
        )
        self.assertEqual(rep_count, 1)
        self.assertEqual(rec_count, 1)

        retrieved_recs = analytics_store.get_stored_recommendations(db_path=self.db_path)
        self.assertEqual(len(retrieved_recs), 1)
        self.assertEqual(retrieved_recs[0]["id"], "REC-REAL-001")
        self.assertEqual(retrieved_recs[0]["recommended_amount"], 15000.0)

        retrieved_reps = analytics_store.get_stored_reallocation_reports(db_path=self.db_path)
        self.assertEqual(len(retrieved_reps), 1)
        self.assertEqual(retrieved_reps[0]["report_id"], "REP-REAL-2026TEST")
        self.assertEqual(retrieved_reps[0]["total_reallocation"], 15000.0)

    def test_afms_026_store_and_get_audit_logs(self):
        """AFMS-026: Verify audit logs and processing history are recorded without data loss."""
        sample_logs = [
            {
                "id": "LOG-TEST-001",
                "action": "AI 60-Day Forecasting Execution",
                "actor": "System AI Engine",
                "status": "success",
                "details": {"processed_records": 150},
                "timestamp": "2026-08-02 10:05:00"
            }
        ]

        stored_logs_count = analytics_store.store_audit_logs(sample_logs, db_path=self.db_path)
        self.assertEqual(stored_logs_count, 1)

        retrieved_logs = analytics_store.get_stored_audit_logs(db_path=self.db_path)
        self.assertEqual(len(retrieved_logs), 1)
        self.assertEqual(retrieved_logs[0]["id"], "LOG-TEST-001")
        self.assertEqual(retrieved_logs[0]["action"], "AI 60-Day Forecasting Execution")

if __name__ == "__main__":
    unittest.main()
