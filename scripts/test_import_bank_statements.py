import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("bank_importer", Path(__file__).with_name("import_bank_statements.py"))
assert SPEC and SPEC.loader
bank_importer = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = bank_importer
SPEC.loader.exec_module(bank_importer)


class FakePage:
    def extract_text(self):
        return "Period Covered 01/01/2026 to 31/01/2026\nCurrency AED\nAccount Number XXXXXXX654001"

    def extract_words(self):
        rows = [
            [("01JAN26", 20), ("AANI", 90), ("FROM", 130), ("CLIENT", 180), ("10.00", 450), ("110.00Cr", 520)],
            [("02JAN26", 20), ("PURCHASE", 90), ("TRXN.", 160), ("5.00", 400), ("105.00Cr", 520)],
        ]
        return [
            {"text": text, "x0": x0, "top": top}
            for row_number, row in enumerate(rows)
            for text, x0 in row
            for top in [100 + row_number * 10]
        ]


class FakePdf:
    pages = [FakePage()]

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class BankStatementParserTest(unittest.TestCase):
    def test_extracts_account_currency_and_balanced_rows(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "statement.pdf"
            source.write_bytes(b"fixture")
            with patch.object(bank_importer.pdfplumber, "open", return_value=FakePdf()):
                batch, transactions, account_last4 = bank_importer.parse_statement(source)

        self.assertEqual(account_last4, "4001")
        self.assertEqual(batch["currency"], "AED")
        self.assertEqual(batch["opening_balance"], "100.00")
        self.assertEqual(batch["closing_balance"], "105.00")
        self.assertEqual(batch["deposit_total"], "10.00")
        self.assertEqual(batch["withdrawal_total"], "5.00")
        self.assertEqual([item.direction for item in transactions], ["credit", "debit"])


if __name__ == "__main__":
    unittest.main()
