#!/usr/bin/env bash
# FinPilot Bharat v1 quality gate: unit/integration tests + eval harness.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== pytest ==="
python -m pytest tests/ -x -q

echo "=== eval harness ==="
python -m evals.harness

echo "=== frontend build hint ==="
echo "Frontend is out of scope for this task. To verify it later: cd frontend && pnpm install && pnpm build"
