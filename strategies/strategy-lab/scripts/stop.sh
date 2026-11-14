#!/usr/bin/env bash
cd "$(dirname "$0")/.."
for n in lab dashboard; do
  if [ -f data/$n.pid ] && kill -0 "$(cat data/$n.pid)" 2>/dev/null; then
    kill "$(cat data/$n.pid)" && echo "$n stopped"
  else echo "$n was not running"; fi
  rm -f data/$n.pid
done
