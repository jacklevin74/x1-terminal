#!/bin/sh
# GATE 3. Run ON EC2 as ubuntu, after gates 1-2:   sh ~/x1-ec2-keys-stage/tools/ec2-key-registrar/deploy/gates/3-ec2-cutover.sh
# Rollback:                                          sh …/3-ec2-cutover.sh rollback
# - Creates, without printing them: two proxy HMAC secrets (production, preview) for x1-ec2-keys and the
#   CloudFront origin-verify secret for Caddy. All files 0600.
# - Installs the staged code + unit, restarts ONLY x1-ec2-keys, configures Caddy on :80, starts Caddy.
# Other services on this instance are not touched.
set -eu
S=$HOME/x1-ec2-keys-stage/tools/ec2-key-registrar

if [ "${1:-}" = "rollback" ]; then
  PREV=$(ls -d /opt/x1-ec2-keys.prev-* | sort | tail -1)
  sudo systemctl disable --now caddy
  sudo rsync -a --delete --exclude x1-ec2-keys.service.installed "$PREV/" /opt/x1-ec2-keys/
  sudo install -m 0644 "$PREV/x1-ec2-keys.service.installed" /etc/systemd/system/x1-ec2-keys.service
  sudo systemctl daemon-reload && sudo systemctl restart x1-ec2-keys && systemctl is-active x1-ec2-keys
  echo "Restored $PREV. Caddy stopped. Secrets in /etc/x1-ec2-keys and /etc/caddy/origin-verify.env left in place."
  exit 0
fi

(cd "$S" && node scripts/check-identity.mjs)   # must print two 'pass' lines; otherwise stop here

ACCOUNT_ID=$(TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60'); curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/dynamic/instance-identity/document | sed -n 's/.*"accountId" *: *"\([0-9]*\)".*/\1/p')
sudo install -d -m 0700 -o root -g root /etc/x1-ec2-keys
printf 'X1_REGISTRAR_ROLE_ARN=arn:aws:iam::%s:role/x1-ec2-key-registrar\nX1_LIFECYCLE_ROLE_ARN=arn:aws:iam::%s:role/x1-ec2-key-lifecycle\n' "$ACCOUNT_ID" "$ACCOUNT_ID" | sudo tee /etc/x1-ec2-keys/env >/dev/null
for name in proxy.secret proxy-preview.secret; do
  sudo test -s /etc/x1-ec2-keys/$name || openssl rand -hex 32 | sudo tee /etc/x1-ec2-keys/$name >/dev/null
  sudo chown x1-ec2-keys:x1-ec2-keys /etc/x1-ec2-keys/$name; sudo chmod 0600 /etc/x1-ec2-keys/$name
done
sudo test -s /etc/caddy/origin-verify.env || printf 'X1_ORIGIN_VERIFY=%s\n' "$(openssl rand -hex 32)" | sudo tee /etc/caddy/origin-verify.env >/dev/null
sudo chown root:root /etc/caddy/origin-verify.env; sudo chmod 0600 /etc/caddy/origin-verify.env

STAMP=$(date +%Y%m%d%H%M%S)
sudo cp -a /opt/x1-ec2-keys "/opt/x1-ec2-keys.prev-$STAMP"
sudo cp /etc/systemd/system/x1-ec2-keys.service "/opt/x1-ec2-keys.prev-$STAMP/x1-ec2-keys.service.installed"
sudo rsync -a --delete --exclude test --exclude 'deploy/*.live-backup.json' "$S/" /opt/x1-ec2-keys/
sudo chown -R root:root /opt/x1-ec2-keys
sudo install -m 0644 "$S/deploy/x1-ec2-keys.service" /etc/systemd/system/x1-ec2-keys.service
sudo systemctl daemon-reload
sudo systemctl restart x1-ec2-keys
sleep 3
systemctl is-active x1-ec2-keys

sudo install -d -m 0755 -o caddy -g caddy /var/log/caddy
sudo install -m 0644 "$S/deploy/Caddyfile.cloudfront" /etc/caddy/Caddyfile
sudo install -d /etc/systemd/system/caddy.service.d
# Drop --environ from the packaged ExecStart: it would print the origin secret to the journal at startup.
printf '[Service]\nEnvironmentFile=/etc/caddy/origin-verify.env\nExecStart=\nExecStart=/usr/bin/caddy run --config /etc/caddy/Caddyfile\nExecReload=\n' | sudo tee /etc/systemd/system/caddy.service.d/origin-verify.conf >/dev/null
sudo sh -c 'set -a; . /etc/caddy/origin-verify.env; caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile' 2>&1 | tail -1
sudo systemctl daemon-reload
sudo systemctl enable --now caddy
sleep 2

echo "--- verify"
echo "x1-ec2-keys loopback /health, no HMAC (expect 401): $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8790/health)"
echo "caddy :80 /health, no origin secret (expect 403):   $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/health)"
echo "caddy :80 with origin secret, no HMAC (expect 401): $(sudo sh -c '. /etc/caddy/origin-verify.env; curl -s -o /dev/null -w "%{http_code}" -H "X-Origin-Verify: v1:$X1_ORIGIN_VERIFY" http://127.0.0.1/health')"
echo "caddy :80 other path (expect 403 or 404):           $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)"
sudo ss -ltn | grep -E ':(80|8790) '   # 8790 must show 127.0.0.1 only
