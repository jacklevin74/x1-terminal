#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Package current local analytics records for the deployed read-only API.
# Authenticated SQL credentials remain local and are never uploaded.
node --env-file-if-exists=.env scripts/prepare-analytics-snapshot.js
if ! npx --yes vercel@65.8.0 whoami; then
  npx --yes vercel@65.8.0 login
fi
exec npx --yes vercel@65.8.0 deploy \
  --prod \
  --project x1-terminal-20261029 \
  --create-if-missing \
  --yes \
  --build-env VITE_BUILDER_ADDRESS=0x95e1642B6C06E06E6ad9412A90e908Dcb09f6c1a \
  --build-env VITE_HYPERLIQUID_TESTNET=false \
  "$@"
