from pathlib import Path
import unittest

from import_v3 import extract, normalize_metric


SOURCE = Path(r"C:\Orchestrator\PEARLCONNEXIONS\Testing Org - General\CareHomes_Dashboard_v3.xlsm")


class ImportV3Tests(unittest.TestCase):
    def test_aliases(self) -> None:
        self.assertEqual(normalize_metric("Relective_Space"), "Reflective_Space")
        self.assertEqual(normalize_metric(" PI_Involved "), "Inc_PI_Involved")
        self.assertEqual(normalize_metric("Reported_24h"), "Inc_Reported_24h")
        self.assertEqual(normalize_metric("Daily_Log"), "Daily_Log")

    @unittest.skipUnless(SOURCE.exists(), "Source workbook is not available")
    def test_authoritative_workbook_reconciles(self) -> None:
        result = extract(SOURCE)["summary"]
        self.assertTrue(result["reconciled"], result["failures"])
        self.assertEqual(result["source_rows"], 210)
        self.assertEqual(result["catalogue_definitions"], 60)
        self.assertEqual(result["house_template_definitions"], 43)
        self.assertEqual(result["homes"], 7)
        self.assertTrue(all(value == 30 for value in result["rows_by_home"].values()))


if __name__ == "__main__":
    unittest.main()
