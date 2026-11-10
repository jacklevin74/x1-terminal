#!/bin/sh
# GATE 5 (Vercel env). Run on the Mac from the repository root after gate 4.
# Pipes the two HMAC secrets from EC2 into Vercel without printing them (Production gets the production
# secret, Preview the preview secret) and points EC2_KEYS_URL at the CloudFront domain.
# Rollback: npx -y vercel@65.12.1 --scope jacklevin74s-projects env rm EC2_KEYS_URL production   (page then shows
# "EC2 key service unavailable"); same for preview and EC2_KEYS_PROXY_SECRET.
set -eu
. ./tools/ec2-key-registrar/deploy/cloudfront.local.env
SSH="ssh -i $HOME/.ssh/hl-ws-ec2-agent -o UserKnownHostsFile=$HOME/.ssh/known_hosts_hlws -o BatchMode=yes ubuntu@13.184.21.180"
V="npx -y vercel@65.12.1 --scope jacklevin74s-projects"
$V link --yes --project x1-terminal-20261029 >/dev/null
$SSH 'sudo cat /etc/x1-ec2-keys/proxy.secret'         | $V env add EC2_KEYS_PROXY_SECRET production --sensitive
$SSH 'sudo cat /etc/x1-ec2-keys/proxy-preview.secret' | $V env add EC2_KEYS_PROXY_SECRET preview --sensitive   # if asked for a git branch, leave it empty (all previews)
printf 'https://%s' "$CF_DOMAIN" | $V env add EC2_KEYS_URL production
printf 'https://%s' "$CF_DOMAIN" | $V env add EC2_KEYS_URL preview
$V env ls | grep EC2_KEYS
echo "Now redeploy the PR preview (push a commit, or: $V redeploy <preview-deployment-url>)."
echo "Verify: open the preview's /api_keys; the KMS card should read 'EC2 connected · us-east-2'."
