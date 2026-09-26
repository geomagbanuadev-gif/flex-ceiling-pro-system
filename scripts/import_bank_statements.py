#!/usr/bin/env python3
"""Validate RAKBANK statement PDFs and optionally import them through Supabase RPC.

Dry run (default):
  python scripts/import_bank_statements.py "C:\\path\\to\\SOA"

Import after reviewing the generated normalized-bank-statements.json:
  python scripts/import_bank_statements.py "C:\\path\\to\\SOA" --write \
    --reviewed-artifact "C:\\path\\to\\SOA\\normalized-bank-statements.json"
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

try:
    import pdfplumber
except ImportError as exc:  # pragma: no cover - environment guidance
    raise SystemExit("pdfplumber is required: python -m pip install pdfplumber") from exc


DATE_RE = re.compile(r"^\d{2}[A-Z]{3}\d{2}$")
MONEY_RE = re.compile(r"^[\d,]+\.\d{2}$")
BALANCE_RE = re.compile(r"^([\d,]+\.\d{2})(Cr|Dr)$")
PERIOD_RE = re.compile(r"Period Covered\s+(\d{2}/\d{2}/\d{4})\s+to\s+(\d{2}/\d{2}/\d{4})")
ACCOUNT_RE = re.compile(r"Account Number\s+X+(\d+)")
CURRENCY_RE = re.compile(r"Currency\s+([A-Z]{3})\b")
VALUE_DATE_RE = re.compile(r"Value Date:\s*(\d{2}/\d{2}/\d{4})", re.I)
REFERENCE_RE = re.compile(r"(?:REF[:/\s-]*|\b)(T_[A-Za-z0-9_-]{8,}|\d{9,})\b", re.I)
HEADER_PREFIXES = (
    "Period Covered", "Page No", "FLEXCEILING", "VUET", "Flexceiling", "Currency",
    "INDUSTRIAL", "P.O.Box", "RAS AL", "IBAN ", "Account Type", "Date Details",
)


@dataclass
class Transaction:
    booking_date: str
    direction: str
    amount: Decimal
    balance_after: Decimal
    description_raw: str
    source_page: int
    source_order: int
    value_date: str | None = None
    counterparty: str | None = None
    bank_reference: str | None = None
    transaction_type: str | None = None
    fingerprint: str = ""

    def as_json(self) -> dict[str, Any]:
        return {
            "booking_date": self.booking_date,
            "value_date": self.value_date,
            "direction": self.direction,
            "amount": str(self.amount),
            "balance_after": str(self.balance_after),
            "description_raw": self.description_raw,
            "counterparty": self.counterparty,
            "bank_reference": self.bank_reference,
            "transaction_type": self.transaction_type,
            "source_page": self.source_page,
            "source_order": self.source_order,
            "fingerprint": self.fingerprint,
        }


def money(value: str) -> Decimal:
    return Decimal(value.replace(",", "")).quantize(Decimal("0.01"))


def iso_date(value: str, fmt: str) -> str:
    return datetime.strptime(value, fmt).date().isoformat()


def normalize(value: str) -> str:
    return " ".join(value.upper().split())


def transaction_type(description: str) -> str:
    upper = normalize(description)
    known = (
        "CHARGE COLLECTION", "PURCHASE TRXN", "AANI TO", "AANI FROM", "OUTWARD T/T",
        "INWARD T/T", "FUNDS TRANSFER WITHIN RAKBANK", "ATM CASH WITHDRAWAL",
        "ATM CASH DEPOSIT", "SWITCH FEE", "COLLECTION COMM", "CASH WITHDRAWAL",
        "CHEQUE DEPOSIT", "IN-HOUSE CHEQUE DEPO",
    )
    return next((item for item in known if upper.startswith(item)), upper.split(" ", 1)[0])


def counterparty(description: str, kind: str) -> str | None:
    first = description.split(" Value Date:", 1)[0]
    if kind in ("AANI TO", "AANI FROM"):
        value = first[len(kind):].strip().split(" T_", 1)[0]
        value = re.split(r"\s+\d{9,}\b", value, 1)[0].strip()
        return value or None
    if kind == "PURCHASE TRXN":
        value = first[len(kind):].lstrip(". ")
        return value.split(" 546", 1)[0].strip() or None
    return None


def grouped_lines(page: Any) -> list[list[dict[str, Any]]]:
    lines: list[list[dict[str, Any]]] = []
    for word in sorted(page.extract_words(), key=lambda item: (round(item["top"], 1), item["x0"])):
        if not lines or abs(lines[-1][0]["top"] - word["top"]) > 1:
            lines.append([word])
        else:
            lines[-1].append(word)
    return lines


def parse_statement(path: Path) -> tuple[dict[str, Any], list[Transaction], str]:
    source_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    transactions: list[Transaction] = []
    period_from = period_to = account_last4 = currency = None
    current: Transaction | None = None

    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            seen_transaction_on_page = False
            page_text = page.extract_text() or ""
            if period_from is None and (match := PERIOD_RE.search(page_text)):
                period_from, period_to = iso_date(match.group(1), "%d/%m/%Y"), iso_date(match.group(2), "%d/%m/%Y")
            if account_last4 is None and (match := ACCOUNT_RE.search(page_text)):
                account_last4 = match.group(1)[-4:]
            if match := CURRENCY_RE.search(page_text):
                page_currency = match.group(1)
                if currency and page_currency != currency:
                    raise ValueError(f"Currency changes inside {path.name}")
                currency = page_currency

            for words in grouped_lines(page):
                text = " ".join(word["text"] for word in words).strip()
                if not text or text.startswith(HEADER_PREFIXES):
                    continue
                if DATE_RE.match(words[0]["text"]):
                    balance_index = next((i for i, word in enumerate(words) if BALANCE_RE.match(word["text"])), None)
                    if balance_index is None or balance_index < 2:
                        continue
                    amount_word = words[balance_index - 1]
                    if not MONEY_RE.match(amount_word["text"]):
                        continue
                    if current:
                        transactions.append(current)
                    balance_match = BALANCE_RE.match(words[balance_index]["text"])
                    assert balance_match
                    description = " ".join(word["text"] for word in words[1:balance_index - 1]).strip()
                    current = Transaction(
                        booking_date=iso_date(words[0]["text"], "%d%b%y"),
                        direction="debit" if amount_word["x0"] < 430 else "credit",
                        amount=money(amount_word["text"]),
                        balance_after=money(balance_match.group(1)) * (-1 if balance_match.group(2) == "Dr" else 1),
                        description_raw=description,
                        source_page=page_number,
                        source_order=len(transactions) + 1,
                    )
                    seen_transaction_on_page = True
                elif current and seen_transaction_on_page and 65 <= words[0]["x0"] < 430:
                    current.description_raw = f"{current.description_raw} {text}".strip()

    if current:
        transactions.append(current)
    if not period_from or not period_to or not account_last4 or not currency or not transactions:
        raise ValueError(f"Could not read statement metadata or transactions from {path.name}")

    for item in transactions:
        item.description_raw = " ".join(item.description_raw.split())
        item.transaction_type = transaction_type(item.description_raw)
        item.counterparty = counterparty(item.description_raw, item.transaction_type)
        if match := VALUE_DATE_RE.search(item.description_raw):
            item.value_date = iso_date(match.group(1), "%d/%m/%Y")
        if match := REFERENCE_RE.search(item.description_raw):
            item.bank_reference = match.group(1)
        fingerprint_source = "|".join((
            account_last4, item.booking_date, item.direction, str(item.amount),
            str(item.balance_after), normalize(item.description_raw),
        ))
        item.fingerprint = hashlib.sha256(fingerprint_source.encode()).hexdigest()

    opening = (transactions[0].balance_after - transactions[0].amount
               if transactions[0].direction == "credit"
               else transactions[0].balance_after + transactions[0].amount)
    expected = opening
    for item in transactions:
        expected += item.amount if item.direction == "credit" else -item.amount
        if expected.quantize(Decimal("0.01")) != item.balance_after:
            raise ValueError(f"Running balance mismatch in {path.name} at row {item.source_order}")
    withdrawals = sum((item.amount for item in transactions if item.direction == "debit"), Decimal())
    deposits = sum((item.amount for item in transactions if item.direction == "credit"), Decimal())
    batch = {
        "period_from": period_from,
        "period_to": period_to,
        "opening_balance": str(opening),
        "closing_balance": str(transactions[-1].balance_after),
        "withdrawal_total": str(withdrawals),
        "deposit_total": str(deposits),
        "transaction_count": len(transactions),
        "source_filename": path.name,
        "source_sha256": source_hash,
        "account_last4": account_last4,
        "currency": currency,
        "validation_result": {"balance_chain": "passed", "duplicates": "passed", "currency": currency},
    }
    return batch, transactions, account_last4


def load_env(path: Path) -> dict[str, str]:
    values = dict(os.environ)
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values.setdefault(key.strip(), value.strip().strip("\"'"))
    return values


def request_json(url: str, key: str, method: str = "GET", body: dict[str, Any] | None = None) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(request) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        message = error.read().decode(errors="replace")
        raise RuntimeError(f"Supabase request failed ({error.code}): {message}") from error


def import_batches(root: Path, parsed: list[tuple[dict[str, Any], list[Transaction], str]]) -> None:
    env = load_env(root / ".env.local")
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    last4s = sorted({last4 for _, _, last4 in parsed})
    if len(last4s) != 1:
        raise RuntimeError("Import one bank account at a time")
    currencies = sorted({batch["currency"] for batch, _, _ in parsed})
    if len(currencies) != 1:
        raise RuntimeError("Import one statement currency at a time")
    query = urllib.parse.urlencode({
        "select": "id,currency", "account_last4": f"eq.{last4s[0]}",
        "currency": f"eq.{currencies[0]}", "active": "eq.true",
    })
    accounts = request_json(f"{url}/rest/v1/bank_accounts?{query}", key)
    if len(accounts) != 1:
        raise RuntimeError(
            f"Expected one active {currencies[0]} bank account ending {last4s[0]}; "
            "run bank-transactions.sql first"
        )
    for batch, transactions, _ in parsed:
        import_id = request_json(f"{url}/rest/v1/rpc/import_bank_statement", key, "POST", {
            "p_account_id": accounts[0]["id"],
            "p_batch": batch,
            "p_transactions": [item.as_json() for item in transactions],
        })
        print(f"Imported {batch['source_filename']}: {len(transactions)} transactions ({import_id})")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate and import RAKBANK statement PDFs")
    parser.add_argument("folder", type=Path, help="Folder containing monthly statement PDFs")
    parser.add_argument("--write", action="store_true", help="Import validated batches into Supabase")
    parser.add_argument("--artifact", type=Path, help="Dry-run output path (defaults inside the statement folder)")
    parser.add_argument("--reviewed-artifact", type=Path, help="Previously reviewed dry-run artifact required by --write")
    args = parser.parse_args()
    files = sorted(args.folder.glob("*.pdf"))
    if not files:
        raise SystemExit("No PDF files found")
    parsed = [parse_statement(path) for path in files]
    parsed.sort(key=lambda item: item[0]["period_from"])
    account_last4s = {item[2] for item in parsed}
    if len(account_last4s) != 1:
        raise ValueError("Statements belong to more than one bank account")
    fingerprints: set[str] = set()
    previous_close: Decimal | None = None
    summary = []
    for batch, transactions, _ in parsed:
        duplicates = [item.fingerprint for item in transactions if item.fingerprint in fingerprints]
        if duplicates:
            raise ValueError(f"Duplicate transactions found in {batch['source_filename']}")
        fingerprints.update(item.fingerprint for item in transactions)
        opening = Decimal(batch["opening_balance"])
        if previous_close is not None and opening != previous_close:
            raise ValueError(f"Opening balance gap before {batch['source_filename']}")
        previous_close = Decimal(batch["closing_balance"])
        summary.append({key: batch[key] for key in (
            "period_from", "period_to", "transaction_count", "withdrawal_total",
            "deposit_total", "opening_balance", "closing_balance", "source_filename",
        )})
    normalized = {
        "account_last4": next(iter(account_last4s)),
        "currency": parsed[0][0]["currency"],
        "batches": [
            {"batch": batch, "transactions": [item.as_json() for item in transactions]}
            for batch, transactions, _ in parsed
        ],
    }
    print(json.dumps({"mode": "write" if args.write else "dry-run", "account_last4": next(iter(account_last4s)),
                      "currency": normalized["currency"], "files": summary,
                      "transaction_count": len(fingerprints)}, indent=2))
    if args.write:
        if not args.reviewed_artifact:
            raise ValueError("--write requires --reviewed-artifact from a separate dry run")
        try:
            reviewed = json.loads(args.reviewed_artifact.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise ValueError(f"Could not read reviewed artifact: {error}") from error
        if reviewed != normalized:
            raise ValueError("Reviewed artifact does not match the current statement extraction")
        import_batches(Path(__file__).resolve().parents[1], parsed)
    else:
        artifact = args.artifact or args.folder / "normalized-bank-statements.json"
        artifact.write_text(json.dumps(normalized, indent=2), encoding="utf-8")
        print(f"Dry run passed. Review {artifact} before importing; no database changes were made.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
