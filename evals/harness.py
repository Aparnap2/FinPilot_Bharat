"""Deterministic eval harness: golden set -> classifier + guardrails -> report.

Runnable as `python -m evals.harness` (repo root on sys.path). No network,
no LLM. Writes evals/report.json + evals/report.md.

Gates (nonzero exit when run as __main__):
  - false_auto_post_rate > 0.01
  - any must_block case with safe_to_post == True

The /api/eval/run endpoint imports main() and returns its dict, so main()
never raises SystemExit itself.
"""
from __future__ import annotations

import json
import sys
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
GOLDEN_PATH = HERE / "golden_dataset.json"
REPORT_JSON = HERE / "report.json"
REPORT_MD = HERE / "report.md"


def _load_cases() -> list[dict]:
    with open(GOLDEN_PATH) as f:
        data = json.load(f)
    assert isinstance(data, list) and len(data) >= 20, "golden set needs >=20 cases"
    adv = sum(1 for c in data if c.get("adversarial"))
    assert adv / len(data) >= 0.30, "golden set needs >=30% adversarial cases"
    return data


def _run_case(case: dict) -> dict:
    from backend.app.classifier import classify
    from backend.app.connectors.mocked import INLINE_LEDGER_CHART
    from backend.app.guardrails import run_guardrails
    from backend.app.models import Evidence
    from backend.app.normalize import normalize_transaction
    from backend.app.seed import CUSTOMERS

    raw = dict(case["transaction"])
    source = str(raw.pop("source", "bank"))
    txn = normalize_transaction(raw, source)

    evidences: list[Evidence] = []
    if case.get("evidence_available"):
        amount = Decimal(str(case["transaction"]["amount"])).quantize(Decimal("0.01"))
        if "conflicting" in case["case_id"]:
            # adversarial: receipt exists but for a different amount
            amount = (amount + Decimal("100.00")).quantize(Decimal("0.01"))
        evidences.append(
            Evidence(
                id=f"ev-{case['case_id']}",
                txn_id=txn.id,
                kind="receipt",
                merchant=txn.merchant,
                amount=amount,
                txn_date=txn.txn_date,
                match_score=0.95,
                summary_redacted=f"Mock receipt for {case['case_id']}",
            )
        )

    customers = [
        {"id": c["id"], "name": c["name"], "phone": c["phone"], "vpa": c["vpa"]}
        for c in CUSTOMERS
    ]
    proposal = classify(txn, evidences, customers, list(INLINE_LEDGER_CHART))
    verdict = run_guardrails(
        txn,
        proposal,
        {
            "suspected_duplicate": "duplicate" in case["case_id"],
            "tax_sensitive": case.get("expected_category") == "tax",
            "evidences": evidences,
        },
    )

    category_match = proposal.proposed_category == case["expected_category"]
    if case.get("evidence_available"):
        evidence_ok = bool(proposal.evidence_ids)
    else:
        evidence_ok = not proposal.evidence_ids
    auto_posted = bool(verdict.safe_to_post)
    false_auto = auto_posted and case.get("expected_action") != "auto_post"
    must_block_caught = (not case.get("must_block")) or (not auto_posted)

    return {
        "case_id": case["case_id"],
        "adversarial": bool(case.get("adversarial")),
        "must_block": bool(case.get("must_block")),
        "expected_category": case["expected_category"],
        "predicted_category": proposal.proposed_category,
        "category_match": category_match,
        "expected_action": case["expected_action"],
        "recommended_action": proposal.recommended_action,
        "confidence": proposal.confidence,
        "evidence_ok": evidence_ok,
        "auto_posted": auto_posted,
        "false_auto_post": false_auto,
        "must_block_caught": must_block_caught,
        "violations": verdict.violations,
    }


def main() -> dict:
    cases = _load_cases()
    results = [_run_case(c) for c in cases]
    total = len(results)
    must_blocks = [r for r in results if r["must_block"]]

    automation_rate = sum(1 for r in results if r["auto_posted"]) / total
    classification_accuracy = sum(1 for r in results if r["category_match"]) / total
    evidence_precision = sum(1 for r in results if r["evidence_ok"]) / total
    false_auto_post_rate = sum(1 for r in results if r["false_auto_post"]) / total
    guardrail_catch_rate = (
        sum(1 for r in must_blocks if r["must_block_caught"]) / len(must_blocks)
        if must_blocks
        else 1.0
    )
    blocked_auto_posts = [r["case_id"] for r in must_blocks if not r["must_block_caught"]]
    passed = false_auto_post_rate <= 0.01 and not blocked_auto_posts

    summary = {
        "total_cases": total,
        "adversarial_cases": sum(1 for r in results if r["adversarial"]),
        "must_block_cases": len(must_blocks),
        "automation_rate": round(automation_rate, 4),
        "classification_accuracy": round(classification_accuracy, 4),
        "evidence_precision": round(evidence_precision, 4),
        "false_auto_post_rate": round(false_auto_post_rate, 4),
        "guardrail_catch_rate": round(guardrail_catch_rate, 4),
        "blocked_auto_posts": blocked_auto_posts,
        "passed": passed,
        "results": results,
    }

    REPORT_JSON.write_text(json.dumps(summary, indent=2))
    lines = [
        "# FinPilot Bharat v1 — Eval Report (mocked)",
        "",
        f"Cases: {total} (adversarial {summary['adversarial_cases']}, must_block {summary['must_block_cases']})",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| automation_rate | {summary['automation_rate']} |",
        f"| classification_accuracy | {summary['classification_accuracy']} |",
        f"| evidence_precision | {summary['evidence_precision']} |",
        f"| false_auto_post_rate | {summary['false_auto_post_rate']} |",
        f"| guardrail_catch_rate | {summary['guardrail_catch_rate']} |",
        f"| gate | {'PASS' if passed else 'FAIL'} |",
        "",
        "| case_id | expected -> predicted | action(exp/sys) | ev_ok | auto | must_block_caught |",
        "|---|---|---|---|---|---|",
    ]
    for r in results:
        lines.append(
            f"| {r['case_id']} | {r['expected_category']} -> {r['predicted_category']} "
            f"| {r['expected_action']}/{r['recommended_action']} "
            f"| {r['evidence_ok']} | {r['auto_posted']} | {r['must_block_caught']} |"
        )
    REPORT_MD.write_text("\n".join(lines) + "\n")
    return summary


if __name__ == "__main__":
    summary = main()
    print(json.dumps({k: v for k, v in summary.items() if k != "results"}, indent=2))
    sys.exit(0 if summary["passed"] else 1)
