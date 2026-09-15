"""Validate CareHomes_Dashboard_v3.xlsm and generate a transactional demo import.

The source workbook stays outside this repository. The generated SQL is intended
for a temporary ignored directory and contains only aggregate QA measures.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import openpyxl

METRIC_ALIASES = {
    "Relective_Space": "Reflective_Space",
    "PI_Involved": "Inc_PI_Involved",
    "Reported_24h": "Inc_Reported_24h",
}


def normalize_metric(code: str) -> str:
    cleaned = code.strip()
    return METRIC_ALIASES.get(cleaned, cleaned)


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def extract(path: Path) -> dict[str, Any]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True, keep_vba=True)
    required_sheets = {"DATABASE", "ImportLog", "SETTINGS"}
    missing = sorted(required_sheets.difference(workbook.sheetnames))
    if missing:
        raise ValueError(f"Missing sheets: {', '.join(missing)}")

    settings = workbook["SETTINGS"]
    catalogue = []
    for values in settings.iter_rows(min_row=40, max_row=99, min_col=2, max_col=6, values_only=True):
        code, display_name, category, source, description = values
        if code:
            catalogue.append(
                {
                    "code": str(code).strip(),
                    "display_name": str(display_name).strip(),
                    "category": str(category).strip(),
                    "source": str(source).strip(),
                    "description": str(description).strip(),
                }
            )

    database = workbook["DATABASE"]
    rows: list[dict[str, Any]] = []
    for values in database.iter_rows(min_row=5, values_only=True):
        if not values[0]:
            continue
        (
            record_id,
            month,
            year,
            _month_year,
            home_code,
            home_name,
            _manager,
            category,
            metric,
            expected,
            actual,
            source_file,
            imported_date,
        ) = values[:13]
        rows.append(
            {
                "source_record_id": str(record_id).strip(),
                "source_file": Path(str(source_file).strip()).name,
                "source_home_code": str(home_code).strip(),
                "source_home_name": str(home_name).strip(),
                "source_category": str(category).strip(),
                "source_metric_code": str(metric).strip(),
                "normalized_metric_code": normalize_metric(str(metric)),
                "source_month": int(month),
                "source_year": int(year),
                "expected": None if expected is None else float(expected),
                "actual": None if actual is None else float(actual),
                "imported_date": imported_date.isoformat() if imported_date else None,
            }
        )

    import_log = workbook["ImportLog"]
    events = []
    for values in import_log.iter_rows(min_row=5, max_col=6, values_only=True):
        if not values[0]:
            continue
        timestamp, home_code, source_file, status, records_added, error_details = values
        events.append(
            {
                "timestamp": timestamp.isoformat() if timestamp else None,
                "home_code": str(home_code).strip(),
                "source_file": Path(str(source_file).strip()).name,
                "status": str(status).strip(),
                "records_added": int(records_added or 0),
                "error": error_details,
            }
        )

    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    home_counts: dict[str, int] = {}
    metric_counts: dict[str, int] = {}
    for row in rows:
        home_counts[row["source_home_code"]] = home_counts.get(row["source_home_code"], 0) + 1
        metric = row["normalized_metric_code"]
        metric_counts[metric] = metric_counts.get(metric, 0) + 1

    summary = {
        "source_name": path.name,
        "source_hash": digest,
        "catalogue_definitions": len(catalogue),
        "house_template_definitions": sum(item["source"] == "House Template" for item in catalogue),
        "source_rows": len(rows),
        "unique_record_ids": len({row["source_record_id"] for row in rows}),
        "homes": len(home_counts),
        "rows_by_home": dict(sorted(home_counts.items())),
        "metrics_in_demo": len(metric_counts),
        "months": sorted({f'{row["source_year"]:04d}-{row["source_month"]:02d}' for row in rows}),
        "import_log_events": len(events),
        "import_log": events,
        "aliases_applied": sorted(
            {
                row["source_metric_code"]: row["normalized_metric_code"]
                for row in rows
                if row["source_metric_code"] != row["normalized_metric_code"]
            }.items()
        ),
    }
    expected = {
        "catalogue_definitions": 60,
        "house_template_definitions": 43,
        "source_rows": 210,
        "unique_record_ids": 210,
        "homes": 7,
        "import_log_events": 7,
    }
    failures = {key: {"expected": value, "actual": summary[key]} for key, value in expected.items() if summary[key] != value}
    if any(count != 30 for count in home_counts.values()):
        failures["rows_by_home"] = {"expected": "30 each", "actual": home_counts}
    summary["reconciled"] = not failures
    summary["failures"] = failures
    return {"summary": summary, "rows": rows}


def render_sql(extracted: dict[str, Any]) -> str:
    summary = extracted["summary"]
    if not summary["reconciled"]:
        raise ValueError("The dry run did not reconcile; SQL was not generated.")
    rows_json = json.dumps(extracted["rows"], ensure_ascii=False, separators=(",", ":"))
    reconciliation_json = json.dumps(summary, ensure_ascii=False, separators=(",", ":"))
    source_name = sql_literal(summary["source_name"])
    source_hash = sql_literal(summary["source_hash"])
    rows_value = sql_literal(rows_json)
    reconciliation_value = sql_literal(reconciliation_json)

    return f"""begin;
do $qa_import$
declare
  target_import_id uuid;
  target_period_id uuid;
  director_id uuid;
begin
  select id into director_id from public.profiles where role = 'director' order by created_at limit 1;

  insert into public.qa_imports(
    source_name, source_hash, data_class, status, source_rows, imported_rows, reconciliation, imported_by
  )
  values ({source_name}, {source_hash}, 'demo', 'committed', 210, 210, {reconciliation_value}::jsonb, director_id)
  on conflict (source_hash) do update set
    status = 'committed',
    imported_rows = excluded.imported_rows,
    reconciliation = excluded.reconciliation,
    imported_by = excluded.imported_by,
    imported_at = now()
  returning id into target_import_id;

  insert into public.qa_periods(month_start, data_class, opens_at, due_at, closed_at)
  values (
    date '2026-06-01',
    'demo',
    (date '2026-07-01' + time '02:05') at time zone 'Europe/London',
    (date '2026-07-10' + time '23:59') at time zone 'Europe/London',
    (date '2026-07-11' + time '00:01') at time zone 'Europe/London'
  )
  on conflict (month_start, data_class) do update
    set opens_at = excluded.opens_at, due_at = excluded.due_at, closed_at = excluded.closed_at
  returning id into target_period_id;

  insert into public.qa_submissions(
    home_id, period_id, status, audit_date, submitted_at, submitted_by,
    approved_at, approved_by, is_late
  )
  select
    h.id,
    target_period_id,
    case when director_id is null then 'submitted'::public.qa_submission_status else 'approved'::public.qa_submission_status end,
    date '2026-06-30',
    (date '2026-07-12' + time '19:11') at time zone 'Europe/London',
    director_id,
    case when director_id is null then null else (date '2026-07-12' + time '19:15') at time zone 'Europe/London' end,
    director_id,
    true
  from public.qa_homes h
  where h.code in ('CH1','CH2','CH3','CH4','CH5','CH6','CH7')
  on conflict (home_id, period_id) do update set
    status = excluded.status,
    audit_date = excluded.audit_date,
    submitted_at = excluded.submitted_at,
    submitted_by = excluded.submitted_by,
    approved_at = excluded.approved_at,
    approved_by = excluded.approved_by,
    is_late = excluded.is_late;

  delete from public.qa_import_rows where import_id = target_import_id;
  insert into public.qa_import_rows(
    import_id, source_record_id, source_file, source_home_code, source_metric_code,
    normalized_metric_code, source_month, source_year, expected, actual
  )
  select
    target_import_id, r.source_record_id, r.source_file, r.source_home_code,
    r.source_metric_code, r.normalized_metric_code, r.source_month, r.source_year,
    r.expected, r.actual
  from jsonb_to_recordset({rows_value}::jsonb) as r(
    source_record_id text,
    source_file text,
    source_home_code text,
    source_home_name text,
    source_category text,
    source_metric_code text,
    normalized_metric_code text,
    source_month integer,
    source_year integer,
    expected numeric,
    actual numeric,
    imported_date text
  );

  insert into public.qa_metric_values(submission_id, metric_code, expected, actual, updated_by)
  select s.id, r.normalized_metric_code, r.expected, r.actual, director_id
  from jsonb_to_recordset({rows_value}::jsonb) as r(
    source_record_id text,
    source_file text,
    source_home_code text,
    source_home_name text,
    source_category text,
    source_metric_code text,
    normalized_metric_code text,
    source_month integer,
    source_year integer,
    expected numeric,
    actual numeric,
    imported_date text
  )
  join public.qa_homes h on h.code = r.source_home_code
  join public.qa_submissions s on s.home_id = h.id and s.period_id = target_period_id
  on conflict (submission_id, metric_code) do update
    set expected = excluded.expected, actual = excluded.actual,
        updated_by = excluded.updated_by, updated_at = now();
end;
$qa_import$;
commit;
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--emit-sql", type=Path)
    args = parser.parse_args()
    extracted = extract(args.workbook)
    print(json.dumps(extracted["summary"], indent=2, ensure_ascii=False))
    if args.emit_sql:
        args.emit_sql.parent.mkdir(parents=True, exist_ok=True)
        args.emit_sql.write_text(render_sql(extracted), encoding="utf-8")


if __name__ == "__main__":
    main()
