#!/bin/sh
# GATE 4b. Run on the Mac. Copies the two secrets from EC2 into Vercel without printing them,
# and sets EC2_KEYS_URL. Production gets the production secret; Preview gets the preview secret.
set -eu
HOST=${1:?hostname required}
SSH="ssh -i $HOME/.ssh/hl-ws-ec2-agent -o UserKnownHostsFile=$HOME/.ssh/known_hosts_hlws -o BatchMode=yes ubuntu@13.184.21.180"
V="npx -y vercel@65.12.1 --scope jacklevin74s-projects"
cd "$(git rev-parse --show-toplevel)"   # project must be linked: $V link --project x1-terminal-20261029
$SSH 'sudo cat /etc/x1-ec2-keys/proxy.secret'         | $V env add EC2_KEYS_PROXY_SECRET production --sensitive
$SSH 'sudo cat /etc/x1-ec2-keys/proxy-preview.secret' | $V env add EC2_KEYS_PROXY_SECRET preview --sensitive
printf 'https://%s' "$HOST" | $V env add EC2_KEYS_URL production
printf 'https://%s' "$HOST" | $V env add EC2_KEYS_URL preview
$V env ls | grep EC2_KEYS
echo "Redeploy the PR preview (push a commit or: $V redeploy <preview-url>) so it picks up the variables."
