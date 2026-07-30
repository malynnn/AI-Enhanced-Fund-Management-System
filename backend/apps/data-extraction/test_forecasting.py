import unittest
import pandas as pd
import datetime
import os

import forecasting

class TestForecasting(unittest.TestCase):

    def setUp(self):
        # Sample Funds
        self.funds_df = pd.DataFrame([
            {"id": "GF-001", "name": "General Fund", "code": "GF", "balance": 5000000.0},
            {"id": "UF-001", "name": "Union Operation Fund", "code": "UF", "balance": 150000.0},
            {"id": "LN-001", "name": "Loan Disbursement Reserve", "code": "LN", "balance": 800000.0}
        ])

        # Sample Transactions spanning past dates
        now = datetime.datetime.now(datetime.timezone.utc)
        d1 = (now - datetime.timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%SZ')
        d2 = (now - datetime.timedelta(days=15)).strftime('%Y-%m-%dT%H:%M:%SZ')
        d3 = (now - datetime.timedelta(days=5)).strftime('%Y-%m-%dT%H:%M:%SZ')

        self.tx_df = pd.DataFrame([
            {"id": "tx-1", "fund_id": "GF-001", "amount": 50000.0, "type": "DEPOSIT", "timestamp": d1, "description": "Dues payment"},
            {"id": "tx-2", "fund_id": "GF-001", "amount": 10000.0, "type": "WITHDRAWAL", "timestamp": d2, "description": "Admin costs"},
            {"id": "tx-3", "fund_id": "UF-001", "amount": 80000.0, "type": "WITHDRAWAL", "timestamp": d1, "description": "Event expenses"},
            {"id": "tx-4", "fund_id": "UF-001", "amount": 40000.0, "type": "WITHDRAWAL", "timestamp": d2, "description": "Equipment lease"},
            {"id": "tx-5", "fund_id": "LN-001", "amount": 20000.0, "type": "DEPOSIT", "timestamp": d3, "description": "Loan repayment"}
        ])

    def test_train_forecasting_model(self):
        """AFMS-017: Test forecasting model training and metrics configuration."""
        model_config = forecasting.train_forecasting_model(self.funds_df, self.tx_df)

        self.assertEqual(model_config["status"], "TRAINED")
        self.assertIn("fund_models", model_config)
        self.assertEqual(len(model_config["fund_models"]), 3)
        self.assertIn("GF-001", model_config["fund_models"])
        self.assertGreaterEqual(model_config["accuracy_score"], 80.0)

    def test_generate_60day_forecast(self):
        """AFMS-018: Test 60-day fund balance forecast generation."""
        model_config = forecasting.train_forecasting_model(self.funds_df, self.tx_df)
        forecast_result = forecasting.generate_60day_forecast(self.funds_df, self.tx_df, model_config)

        self.assertIn("forecasts", forecast_result)
        self.assertIn("forecast_timeline", forecast_result)
        self.assertEqual(len(forecast_result["forecasts"]), 3)

        uf_fc = next(f for f in forecast_result["forecasts"] if f["fund_id"] == "UF-001")
        self.assertEqual(uf_fc["trend"], "down")
        self.assertIn("confidence", uf_fc)
        self.assertIn("lower_bound", uf_fc)
        self.assertIn("upper_bound", uf_fc)

    def test_detect_shortage_alerts(self):
        """AFMS-019: Test shortage alert detection engine."""
        model_config = forecasting.train_forecasting_model(self.funds_df, self.tx_df)
        forecast_result = forecasting.generate_60day_forecast(self.funds_df, self.tx_df, model_config)
        alerts = forecasting.detect_shortage_alerts(forecast_result, self.funds_df)

        # Union fund started with 150k and had heavy withdrawals, so it should trigger an alert
        self.assertTrue(len(alerts) > 0)
        uf_alert = next((a for a in alerts if a["fund_id"] == "UF-001"), None)
        self.assertIsNotNone(uf_alert)
        self.assertIn(uf_alert["severity"], ["high", "medium"])
        self.assertIsNotNone(uf_alert["predicted_date"])

    def test_generate_recommendations(self):
        """AFMS-020: Test rule-based recommendation engine."""
        model_config = forecasting.train_forecasting_model(self.funds_df, self.tx_df)
        forecast_result = forecasting.generate_60day_forecast(self.funds_df, self.tx_df, model_config)
        alerts = forecasting.detect_shortage_alerts(forecast_result, self.funds_df)
        recs = forecasting.generate_recommendations(forecast_result, alerts, self.funds_df)

        self.assertTrue(len(recs) > 0)
        real_rec = next((r for r in recs if r.get("source_fund_id") == "GF-001"), None)
        self.assertIsNotNone(real_rec)
        self.assertEqual(real_rec["source_fund_id"], "GF-001")
        self.assertEqual(real_rec["target_fund_id"], "UF-001")

    def test_generate_reallocation_report(self):
        """AFMS-021: Test fund reallocation report generation."""
        model_config = forecasting.train_forecasting_model(self.funds_df, self.tx_df)
        forecast_result = forecasting.generate_60day_forecast(self.funds_df, self.tx_df, model_config)
        alerts = forecasting.detect_shortage_alerts(forecast_result, self.funds_df)
        recs = forecasting.generate_recommendations(forecast_result, alerts, self.funds_df)
        report = forecasting.generate_reallocation_report(recs, forecast_result, self.funds_df)

        self.assertIn("report_id", report)
        self.assertIn("executive_summary", report)
        self.assertIn("itemized_recommendations", report)
        self.assertEqual(report["executive_summary"]["total_funds_analyzed"], 3)

    def test_run_forecasting_pipeline(self):
        """Master pipeline integration test."""
        res = forecasting.run_forecasting_pipeline(self.funds_df, self.tx_df)

        self.assertIn("model_config", res)
        self.assertIn("forecasts", res)
        self.assertIn("shortage_alerts", res)
        self.assertIn("recommendations", res)
        self.assertIn("reallocation_report", res)
        self.assertIn("audit_logs", res)

if __name__ == "__main__":
    unittest.main()
