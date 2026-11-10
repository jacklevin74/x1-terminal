#!/bin/sh
# Runs gates 1-5 in order, asking before each one and stopping at the first failure.
# Then optionally triggers a fresh PR preview and turns preview mutations on for the one real test.
# Run on the Mac:  sh tools/ec2-key-registrar/deploy/gates/run-all.sh   (from any directory)
# Secrets are never printed; each gate script verifies itself and has its own rollback.
set -eu
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$ROOT"
G=tools/ec2-key-registrar/deploy/gates
EC2="ssh -i $HOME/.ssh/hl-ws-ec2-agent -o UserKnownHostsFile=$HOME/.ssh/known_hosts_hlws -o BatchMode=yes ubuntu@13.184.21.180"

ask() { printf '\n==> %s\n    Run it? [y = run, s = skip, q = quit] ' "$1"; read -r a; case "$a" in y|Y) return 0;; s|S) echo "    skipped"; return 1;; *) echo "    stopped"; exit 0;; esac; }
fail() { echo; echo "FAILED at: $1"; echo "Rollback for this step: $2"; echo "Nothing after this step was run."; exit 1; }

echo "x1 EC2 key service: CloudFront cutover (repo: $ROOT)"
aws sts get-caller-identity --query Account --output text >/dev/null || { echo "AWS CLI not signed in"; exit 1; }
$EC2 true || { echo "cannot SSH to EC2"; exit 1; }

if ask "1/5 IAM: create x1-ec2-key-lifecycle, replace registrar policy (removes PutKeyPolicy)"; then
  sh $G/1-iam.sh || fail "1 IAM" "re-apply $G/../registrar-policy.previous.json (fill in the account id) and delete role x1-ec2-key-lifecycle"
fi
if ask "2/5 Security group: new group x1-ec2-keys-cloudfront, TCP 80 from CloudFront only, attached to the instance"; then
  sh $G/2-security-group.sh || fail "2 security group" "sh $G/2-security-group.sh rollback"
fi
if ask "3/5 EC2 cutover: secrets (never printed), new service code, restart x1-ec2-keys, Caddy on :80"; then
  $EC2 'sh ~/x1-ec2-keys-stage/tools/ec2-key-registrar/deploy/gates/3-ec2-cutover.sh' || fail "3 EC2 cutover" "$EC2 'sh ~/x1-ec2-keys-stage/tools/ec2-key-registrar/deploy/gates/3-ec2-cutover.sh rollback'"
fi
if ask "4/5 CloudFront: origin request policy + distribution (waits until deployed, ~5-15 min)"; then
  sh $G/4-cloudfront.sh || fail "4 CloudFront" "sh $G/4-cloudfront.sh rollback"
fi
if ask "5/5 Vercel: EC2_KEYS_URL + proxy secrets for Production and Preview (if asked for a git branch, press Enter)"; then
  sh $G/5-vercel-env.sh || fail "5 Vercel env" "npx -y vercel@65.12.1 --scope jacklevin74s-projects env rm EC2_KEYS_URL production (and preview, and EC2_KEYS_PROXY_SECRET)"
fi

if ask "Redeploy the PR #7 preview so it picks up the new env (pushes an empty commit to the PR branch)"; then
  git commit -q --allow-empty -m "chore: redeploy preview with EC2 key service env" && git push -q && echo "    pushed; the preview rebuilds in ~2 min"
fi
if ask "Turn preview mutations ON for the one real test (create, disable, enable, delete, cancel-delete)"; then
  $EC2 'sh ~/x1-ec2-keys-stage/tools/ec2-key-registrar/deploy/gates/6-preview-mutations.sh on'
  cat <<'EOF'

    Now, on the PR #7 preview /api_keys with your owner wallet:
      create a key -> disable -> enable -> delete -> cancel deletion.
    Do NOT approve it on Hyperliquid. When done, turn mutations off:
      ssh -i ~/.ssh/hl-ws-ec2-agent ubuntu@13.184.21.180 'sh ~/x1-ec2-keys-stage/tools/ec2-key-registrar/deploy/gates/6-preview-mutations.sh off'
    Then merge PR #7 (production deploys automatically).
EOF
fi
echo; echo "Done."
