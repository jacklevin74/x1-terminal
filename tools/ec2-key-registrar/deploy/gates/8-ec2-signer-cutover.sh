#!/bin/sh
# GATE 8. Run ON EC2 as ubuntu after gate 7 and the signer-account stack:
#   sh ~/x1-ec2-keys-stage/tools/ec2-key-registrar/deploy/gates/8-ec2-signer-cutover.sh <signer-account-id>
#   sh …/8-ec2-signer-cutover.sh rollback
# - Installs the staged code (new keys via the signer-account provisioner; legacy keys lifecycle only).
# - Rewrites /etc/x1-ec2-keys/env: drops X1_REGISTRAR_ROLE_ARN, adds X1_SIGNER_CLIENT_ROLE_ARN and X1_PROVISIONER_ARN.
#   Secrets, Caddy and CloudFront are not touched. Restarts ONLY x1-ec2-keys. The SQLite database migrates in place
#   (existing rows become backend=legacy); a copy is kept next to the code backup.
set -eu
S=$HOME/x1-ec2-keys-stage/tools/ec2-key-registrar
if [ "${1:-}" = "rollback" ]; then
  PREV=$(ls -d /opt/x1-ec2-keys.prev-signer-* | sort | tail -1)
  sudo rsync -a --delete --exclude 'env.installed' --exclude 'keys.sqlite.installed' "$PREV/" /opt/x1-ec2-keys/
  sudo install -m 0600 "$PREV/env.installed" /etc/x1-ec2-keys/env
  # The old code ignores the added columns; restoring the database copy is only needed if keys were created since.
  sudo systemctl restart x1-ec2-keys && systemctl is-active x1-ec2-keys
  echo "Restored $PREV (code + env). Database copy: $PREV/keys.sqlite.installed"
  exit 0
fi
SIGNER_ACCOUNT_ID=${1:?signer account id required}
(cd "$S" && node scripts/check-identity.mjs)   # must print two 'pass' lines; otherwise stop here
ACCOUNT_ID=$(TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60'); curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/dynamic/instance-identity/document | sed -n 's/.*"accountId" *: *"\([0-9]*\)".*/\1/p')
STAMP=$(date +%Y%m%d%H%M%S); PREV=/opt/x1-ec2-keys.prev-signer-$STAMP
sudo cp -a /opt/x1-ec2-keys "$PREV"
sudo cp /etc/x1-ec2-keys/env "$PREV/env.installed"
sudo sqlite3 /var/lib/x1-ec2-keys/keys.sqlite ".backup '$PREV/keys.sqlite.installed'" 2>/dev/null || sudo cp /var/lib/x1-ec2-keys/keys.sqlite "$PREV/keys.sqlite.installed"
printf 'X1_LIFECYCLE_ROLE_ARN=arn:aws:iam::%s:role/x1-ec2-key-lifecycle\nX1_SIGNER_CLIENT_ROLE_ARN=arn:aws:iam::%s:role/x1-signer-key-client\nX1_PROVISIONER_ARN=arn:aws:lambda:us-east-2:%s:function:hl-copybot-provisioner\n' \
  "$ACCOUNT_ID" "$ACCOUNT_ID" "$SIGNER_ACCOUNT_ID" | sudo tee /etc/x1-ec2-keys/env >/dev/null
sudo chmod 0600 /etc/x1-ec2-keys/env
sudo rsync -a --delete --exclude test --exclude 'deploy/*.live-backup.json' "$S/" /opt/x1-ec2-keys/
sudo chown -R root:root /opt/x1-ec2-keys
sudo install -m 0644 "$S/deploy/x1-ec2-keys.service" /etc/systemd/system/x1-ec2-keys.service
sudo systemctl daemon-reload
sudo systemctl restart x1-ec2-keys
sleep 3; systemctl is-active x1-ec2-keys
journalctl -u x1-ec2-keys -n 3 --no-pager -o cat   # expect: "new keys: signer account"
echo "Backup: $PREV"
