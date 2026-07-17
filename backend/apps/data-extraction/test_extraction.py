import unittest
import pandas as pd
import os
import json
import tempfile
from unittest.mock import MagicMock, patch

import config
import db_connection
import extractor
import validator
import analytics_store
import logger

# ──────────────────────────────────────────────
# Shared test fixtures
# ──────────────────────────────────────────────

RAW_FUNDS = pd.DataFrame([
    {"id": "GF",  "name": "General Fund",  "code": "GF",  "balance": "1000.50"},
    {"id": "UF",  "name": "Union Fund",    "code": "UF",  "balance": "2000"},
    {"id": None,  "name": "Missing ID",    "code": "MID", "balance": "500"},   # dropped
    {"id": "DF",  "name": "Missing Code",  "code": "",    "balance": "500"},   # dropped
    {"id": "BF",  "name": "Bad Balance",   "code": "BF",  "balance": "abc"},   # dropped
])

RAW_TX = pd.DataFrame([
    {"id": "t1", "fund_id": "GF", "amount": "100.50",  "type": "DEPOSIT",     "timestamp": "2026-07-16T12:00:00Z"},
    {"id": "t2", "fund_id": "UF", "amount": "200.00",  "type": "WITHDRAWAL",  "timestamp": "2026-07-16T13:00:00Z"},
    {"id": "t3", "fund_id": "GF", "amount": "-50.00",  "type": "DEPOSIT",     "timestamp": "2026-07-16T14:00:00Z"},  # negative → drop
    {"id": "t4", "fund_id": "GF", "amount": "invalid", "type": "DEPOSIT",     "timestamp": "2026-07-16T14:00:00Z"},  # non-numeric → drop
    {"id": "t5", "fund_id": "GF", "amount": "50.00",   "type": "INVALID_TYPE","timestamp": "2026-07-16T14:00:00Z"},  # bad enum → drop
    {"id": "t6", "fund_id": "GF", "amount": "50.00",   "type": "DEPOSIT",     "timestamp": "invalid_date"},           # bad date → drop
    {"id": None, "fund_id": "GF", "amount": "50.00",   "type": "DEPOSIT",     "timestamp": "2026-07-16T14:00:00Z"},   # missing ID → drop
])


# ──────────────────────────────────────────────
# AFMS-004 / AFMS-005: Validation Tests
# ──────────────────────────────────────────────

class TestValidation(unittest.TestCase):

    def test_validate_funds(self):
        cleaned_df, stats = validator.validate_funds(RAW_FUNDS)

        self.assertEqual(stats['initial_count'], 5)
        self.assertEqual(stats['final_count'], 2)
        self.assertEqual(stats['total_dropped'], 3)

        self.assertIn("GF", cleaned_df['id'].values)
        self.assertIn("UF", cleaned_df['id'].values)
        self.assertAlmostEqual(cleaned_df.loc[cleaned_df['id'] == 'GF', 'balance'].values[0], 1000.50)
        self.assertAlmostEqual(cleaned_df.loc[cleaned_df['id'] == 'UF', 'balance'].values[0], 2000.0)

    def test_validate_transactions(self):
        cleaned_df, stats = validator.validate_transactions(RAW_TX)

        self.assertEqual(stats['initial_count'], 7)
        self.assertEqual(stats['final_count'], 2)
        self.assertEqual(stats['total_dropped'], 5)

        self.assertIn("t1", cleaned_df['id'].values)
        self.assertIn("t2", cleaned_df['id'].values)
        self.assertAlmostEqual(cleaned_df.loc[cleaned_df['id'] == 't1', 'amount'].values[0], 100.50)


# ──────────────────────────────────────────────
# AFMS-009: Record Integrity Verification Tests
# ──────────────────────────────────────────────

class TestIntegrityVerification(unittest.TestCase):

    def _get_clean_funds(self):
        clean_df, _ = validator.validate_funds(RAW_FUNDS)
        return clean_df

    def _get_clean_tx(self):
        clean_df, _ = validator.validate_transactions(RAW_TX)
        return clean_df

    def test_funds_integrity_passes(self):
        clean_df = self._get_clean_funds()
        report = validator.verify_record_integrity(
            raw_df=RAW_FUNDS,
            clean_df=clean_df,
            required_cols=['id', 'name', 'code', 'balance'],
            label='funds'
        )
        self.assertTrue(report['passed'])
        self.assertEqual(report['source_count'], 5)
        self.assertEqual(report['extracted_count'], 2)
        self.assertEqual(report['dropped_count'], 3)
        self.assertEqual(report['missing_columns'], [])
        self.assertEqual(report['empty_columns'], [])

    def test_tx_integrity_passes(self):
        clean_df = self._get_clean_tx()
        report = validator.verify_record_integrity(
            raw_df=RAW_TX,
            clean_df=clean_df,
            required_cols=['id', 'fund_id', 'amount', 'type', 'timestamp'],
            label='transactions'
        )
        self.assertTrue(report['passed'])
        self.assertEqual(report['source_count'], 7)
        self.assertEqual(report['extracted_count'], 2)

    def test_integrity_fails_on_missing_column(self):
        clean_df = self._get_clean_funds().drop(columns=['balance'])
        report = validator.verify_record_integrity(
            raw_df=RAW_FUNDS,
            clean_df=clean_df,
            required_cols=['id', 'name', 'code', 'balance'],
            label='funds'
        )
        self.assertFalse(report['passed'])
        self.assertIn('balance', report['missing_columns'])

    def test_integrity_fails_on_empty_result(self):
        empty_df = pd.DataFrame(columns=['id', 'name', 'code', 'balance'])
        report = validator.verify_record_integrity(
            raw_df=RAW_FUNDS,
            clean_df=empty_df,
            required_cols=['id', 'name', 'code', 'balance'],
            label='funds'
        )
        self.assertFalse(report['passed'])
        self.assertEqual(report['extracted_count'], 0)


# ──────────────────────────────────────────────
# AFMS-006 / AFMS-007: Analytics SQLite Tests
# ──────────────────────────────────────────────

class TestAnalyticsStore(unittest.TestCase):

    def setUp(self):
        # Use a temp file for each test so they are isolated
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.db_path = self.tmp.name

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def _get_clean_data(self):
        clean_funds, _ = validator.validate_funds(RAW_FUNDS)
        clean_tx,    _ = validator.validate_transactions(RAW_TX)
        return clean_funds, clean_tx

    def test_init_db_creates_tables(self):
        """AFMS-006: init_db should create funds and fund_transactions tables."""
        analytics_store.init_db(db_path=self.db_path)

        import sqlite3
        conn = sqlite3.connect(self.db_path)
        cur  = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cur.fetchall()}
        conn.close()

        self.assertIn('funds', tables)
        self.assertIn('fund_transactions', tables)

    def test_store_validated_data(self):
        """AFMS-007: store_validated_data should persist all clean records."""
        clean_funds, clean_tx = self._get_clean_data()
        funds_stored, tx_stored = analytics_store.store_validated_data(
            clean_funds, clean_tx, db_path=self.db_path
        )

        self.assertEqual(funds_stored, 2)
        self.assertEqual(tx_stored, 2)

    def test_query_stored_data_roundtrip(self):
        """AFMS-007: Records stored should be retrievable and match original."""
        clean_funds, clean_tx = self._get_clean_data()
        analytics_store.store_validated_data(clean_funds, clean_tx, db_path=self.db_path)

        read_funds, read_tx = analytics_store.query_stored_data(db_path=self.db_path)

        self.assertEqual(len(read_funds), 2)
        self.assertEqual(len(read_tx), 2)
        self.assertIn('GF', read_funds['id'].values)
        self.assertIn('t1', read_tx['id'].values)

    def test_store_is_idempotent(self):
        """AFMS-007: Running store twice should not duplicate records (replace)."""
        clean_funds, clean_tx = self._get_clean_data()
        analytics_store.store_validated_data(clean_funds, clean_tx, db_path=self.db_path)
        analytics_store.store_validated_data(clean_funds, clean_tx, db_path=self.db_path)

        read_funds, read_tx = analytics_store.query_stored_data(db_path=self.db_path)
        self.assertEqual(len(read_funds), 2)
        self.assertEqual(len(read_tx), 2)


# ──────────────────────────────────────────────
# AFMS-008: Extraction Logger Tests
# ──────────────────────────────────────────────

class TestLogger(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.tmp.close()
        os.remove(self.tmp.name)   # delete so logger creates it fresh
        self.log_path = self.tmp.name

    def tearDown(self):
        if os.path.exists(self.log_path):
            os.remove(self.log_path)

    def _make_stats(self, initial, final):
        return {
            "initial_count": initial,
            "final_count":   final,
            "total_dropped": initial - final,
            "drop_reasons":  {}
        }

    def test_log_creates_file(self):
        """AFMS-008: log_extraction should create the log file."""
        logger.log_extraction(
            source="csv",
            funds_stats=self._make_stats(5, 2),
            tx_stats=self._make_stats(7, 2),
            success=True,
            message="Test run",
            log_path=self.log_path
        )
        self.assertTrue(os.path.exists(self.log_path))

    def test_log_entry_structure(self):
        """AFMS-008: Log entry must contain required fields."""
        entry = logger.log_extraction(
            source="db",
            funds_stats=self._make_stats(5, 2),
            tx_stats=self._make_stats(7, 2),
            success=True,
            message="All good",
            security_verified=True,
            log_path=self.log_path
        )
        for field in ['timestamp', 'source', 'success', 'message', 'funds', 'transactions']:
            self.assertIn(field, entry)
        self.assertEqual(entry['source'], 'db')
        self.assertTrue(entry['success'])
        self.assertEqual(entry['funds']['initial_count'], 5)
        self.assertEqual(entry['transactions']['dropped'], 5)

    def test_log_appends_multiple_entries(self):
        """AFMS-008: Each run appends a new entry; log is a list."""
        for i in range(3):
            logger.log_extraction(
                source="csv",
                funds_stats=self._make_stats(5, 2),
                tx_stats=self._make_stats(7, 2),
                success=True,
                message=f"Run {i}",
                log_path=self.log_path
            )
        entries = logger.read_log(self.log_path)
        self.assertEqual(len(entries), 3)

    def test_log_failure_helper(self):
        """AFMS-008: log_failure should record a failed entry."""
        logger.log_failure(
            source="db",
            error_message="Connection refused",
            log_path=self.log_path
        )
        entries = logger.read_log(self.log_path)
        self.assertEqual(len(entries), 1)
        self.assertFalse(entries[0]['success'])


# ──────────────────────────────────────────────
# AFMS-001: DB Security Check
# ──────────────────────────────────────────────

class TestDBSecurity(unittest.TestCase):

    def test_db_security_check_blocks_write(self):
        """AFMS-001: verify_readonly_security returns True when INSERT is blocked."""
        import psycopg2
        mock_conn   = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = psycopg2.errors.InsufficientPrivilege("Permission Denied")

        is_secure, msg = db_connection.verify_readonly_security(mock_conn)
        self.assertTrue(is_secure)
        self.assertIn("blocked", msg)


# ──────────────────────────────────────────────
# AFMS-003: CSV Extraction
# ──────────────────────────────────────────────

class TestCSVExtraction(unittest.TestCase):

    @patch('pandas.read_csv')
    def test_extract_from_csv(self, mock_read_csv):
        """AFMS-003: extract_from_csv returns DataFrames from CSV paths."""
        mock_read_csv.side_effect = [RAW_FUNDS.copy(), RAW_TX.copy()]
        funds_df, tx_df = extractor.extract_from_csv("funds.csv", "tx.csv")
        self.assertEqual(len(funds_df), 5)
        self.assertEqual(len(tx_df), 7)


if __name__ == '__main__':
    unittest.main()
