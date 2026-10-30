#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# This uses a separate project, with the public builder address and mainnet
# explicitly supplied at build time. No private keys or API tokens are needed.
if ! npx --yes vercel@65.8.0 whoami; then
  npx --yes vercel@65.8.0 login
fi
exec npx --yes vercel@65.8.0 deploy \
  --prod \
  --project x1-terminal-20261029 \
  --create-if-missing \
  --yes \
  --build-env VITE_BUILDER_ADDRESS=0x95e1642B6C06E06E6ad9412A90e908Dcb09f6c1a \
  --build-env VITE_HYPERLIQUID_TESTNET=false
