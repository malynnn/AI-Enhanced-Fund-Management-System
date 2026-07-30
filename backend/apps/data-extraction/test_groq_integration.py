import unittest
import os
import json
import tempfile
import pandas as pd

import config
import groq_advisor
import forecasting
import analytics_store

class TestGroqIntegration(unittest.TestCase):

    def setUp(self):
        self.api_key = os.getenv("GROQ_API_KEY", config.GROQ_API_KEY)
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")

        self.funds_df = pd.DataFrame([
            {"id": "GF-001", "name": "General Fund", "code": "GF", "balance": 2500000.0},
            {"id": "UF-001", "name": "Union Fund", "code": "UF", "balance": 150000.0}
        ])

        self.tx_df = pd.DataFrame([
            {"id": "tx-1", "fund_id": "GF-001", "amount": 100000.0, "type": "DEPOSIT", "timestamp": "2026-07-01T10:00:00Z"},
            {"id": "tx-2", "fund_id": "UF-001", "amount": 80000.0, "type": "WITHDRAWAL", "timestamp": "2026-07-02T10:00:00Z"}
        ])

    def tearDown(self):
        os.close(self.db_fd)
        if os.path.exists(self.db_path):
            os.unlink(self.db_path)

    def test_call_groq_api_live(self):
        """Verify live connection to Groq LLaMA-3.3-70B API."""
        if not self.api_key:
            self.skipTest("GROQ_API_KEY not configured.")

        res = groq_advisor.call_groq_api("Respond with the exact word PASSED", api_key=self.api_key)
        self.assertIsNotNone(res)
        self.assertIn("PASSED", res)

    def test_generate_groq_executive_summary(self):
        """Verify Groq AI executive summary generation."""
        sample_forecasts = [{"fund_name": "General Fund", "projected_balance_60d": 2600000.0}]
        summary = groq_advisor.generate_groq_executive_summary(sample_forecasts, [], api_key=self.api_key)

        self.assertIn("executive_narrative", summary)
        self.assertIn("key_takeaways", summary)
        self.assertIn("risk_level", summary)

    def test_run_forecasting_pipeline_with_groq_and_sqlite(self):
        """Verify full end-to-end pipeline execution with Groq AI advice and SQLite storage."""
        results = forecasting.run_forecasting_pipeline(self.funds_df, self.tx_df, api_key=self.api_key)

        self.assertIn("reallocation_report", results)
        exec_sum = results["reallocation_report"].get("executive_summary", {})
        self.assertIn("ai_narrative", exec_sum)
        self.assertIn("risk_level", exec_sum)

        # Store in SQLite and verify retrievability
        fc_count = analytics_store.store_forecast_results(results["forecasts"], db_path=self.db_path)
        rep_count, rec_count = analytics_store.store_recommendation_reports(results["reallocation_report"], results["recommendations"], db_path=self.db_path)
        audit_count = analytics_store.store_audit_logs(results["audit_logs"], db_path=self.db_path)

        self.assertEqual(fc_count, 2)
        self.assertEqual(rep_count, 1)
        self.assertGreaterEqual(rec_count, 1)
        self.assertEqual(audit_count, 1)

        stored_reps = analytics_store.get_stored_reallocation_reports(db_path=self.db_path)
        self.assertEqual(len(stored_reps), 1)
        self.assertIn("ai_narrative", stored_reps[0]["executive_summary"])

if __name__ == "__main__":
    unittest.main()
