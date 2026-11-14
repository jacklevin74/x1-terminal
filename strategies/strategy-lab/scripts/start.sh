#!/usr/bin/env bash
# Start (or restart) the strategy lab and the dashboard. Safe to re-run.
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${DASHBOARD_PORT:-7700}"
"$(dirname "$0")/stop.sh" >/dev/null

setsid nohup .venv/bin/python -m app.main lab > data/lab.log 2>&1 < /dev/null &
echo $! > data/lab.pid
setsid nohup .venv/bin/streamlit run dashboard/app.py --server.address 0.0.0.0 --server.port "$PORT" \
  --server.headless true --browser.gatherUsageStats false > data/dashboard.log 2>&1 < /dev/null &
echo $! > data/dashboard.pid
sleep 8
for n in lab dashboard; do
  if kill -0 "$(cat data/$n.pid)" 2>/dev/null; then echo "$n: running (pid $(cat data/$n.pid), log data/$n.log)"
  else echo "$n: NOT running, see data/$n.log"; fi
done
