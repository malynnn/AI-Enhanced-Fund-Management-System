import unittest
import pandas as pd
import os
import json
from unittest.mock import MagicMock, patch

import config
import db_connection
import extractor
import validator

class TestDataExtraction(unittest.TestCase):

    def setUp(self):
        # Setup mock data for validation tests
        self.raw_funds = pd.DataFrame([
            {"id": "GF", "name": "General Fund", "code": "GF", "balance": "1000.50"},
            {"id": "UF", "name": "Union Fund", "code": "UF", "balance": "2000"},
            {"id": None, "name": "Missing ID", "code": "MID", "balance": "500"},  # Should be dropped
            {"id": "DF", "name": "Missing Code", "code": "", "balance": "500"},   # Should be dropped
            {"id": "BF", "name": "Bad Balance", "code": "BF", "balance": "abc"}   # Should be dropped
        ])

        self.raw_tx = pd.DataFrame([
            {"id": "t1", "fund_id": "GF", "amount": "100.50", "type": "DEPOSIT", "timestamp": "2026-07-16T12:00:00Z"},
            {"id": "t2", "fund_id": "UF", "amount": "200.00", "type": "WITHDRAWAL", "timestamp": "2026-07-16T13:00:00Z"},
            {"id": "t3", "fund_id": "GF", "amount": "-50.00", "type": "DEPOSIT", "timestamp": "2026-07-16T14:00:00Z"}, # Negative amount -> drop
            {"id": "t4", "fund_id": "GF", "amount": "invalid", "type": "DEPOSIT", "timestamp": "2026-07-16T14:00:00Z"}, # Non-numeric amount -> drop
            {"id": "t5", "fund_id": "GF", "amount": "50.00", "type": "INVALID_TYPE", "timestamp": "2026-07-16T14:00:00Z"}, # Bad enum -> drop
            {"id": "t6", "fund_id": "GF", "amount": "50.00", "type": "DEPOSIT", "timestamp": "invalid_date"},  # Bad date -> drop
            {"id": None, "fund_id": "GF", "amount": "50.00", "type": "DEPOSIT", "timestamp": "2026-07-16T14:00:00Z"}  # Missing ID -> drop
        ])

    def test_validate_funds(self):
        cleaned_df, stats = validator.validate_funds(self.raw_funds)
        
        self.assertEqual(stats['initial_count'], 5)
        self.assertEqual(stats['final_count'], 2)
        self.assertEqual(stats['total_dropped'], 3)
        
        # Verify valid records remain
        self.assertIn("GF", cleaned_df['id'].values)
        self.assertIn("UF", cleaned_df['id'].values)
        self.assertEqual(cleaned_df.loc[cleaned_df['id'] == 'GF', 'balance'].values[0], 1000.50)
        self.assertEqual(cleaned_df.loc[cleaned_df['id'] == 'UF', 'balance'].values[0], 2000.0)

    def test_validate_transactions(self):
        cleaned_df, stats = validator.validate_transactions(self.raw_tx)
        
        self.assertEqual(stats['initial_count'], 7)
        self.assertEqual(stats['final_count'], 2)
        self.assertEqual(stats['total_dropped'], 5)
        
        # Verify types and values
        self.assertIn("t1", cleaned_df['id'].values)
        self.assertIn("t2", cleaned_df['id'].values)
        self.assertEqual(cleaned_df.loc[cleaned_df['id'] == 't1', 'amount'].values[0], 100.50)

    def test_db_security_check_failures(self):
        # We test that verify_readonly_security correctly fails/catches writes
        # We mock the cursor to check execution
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        
        # Mocking an InsufficientPrivilege error (which is psycopg2's permission error)
        import psycopg2
        mock_cursor.execute.side_effect = psycopg2.errors.InsufficientPrivilege("Permission Denied")
        
        is_secure, msg = db_connection.verify_readonly_security(mock_conn)
        self.assertTrue(is_secure)
        self.assertIn("blocked", msg)

    @patch('pandas.read_csv')
    def test_extract_from_csv(self, mock_read_csv):
        mock_read_csv.side_effect = [self.raw_funds, self.raw_tx]
        funds_df, tx_df = extractor.extract_from_csv("funds.csv", "tx.csv")
        self.assertEqual(len(funds_df), 5)
        self.assertEqual(len(tx_df), 7)

if __name__ == '__main__':
    unittest.main()
