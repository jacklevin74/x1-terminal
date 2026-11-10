#!/bin/sh
# GATE 4. Run ON EC2 as ubuntu after gates 1-3:  sh 4-ec2-cutover.sh keys-api.<your-domain>
# Expects the new code staged in ~/x1-ec2-keys-stage/tools/ec2-key-registrar (with node_modules).
# Generates two different 32-byte secrets (production, preview) without printing them, installs the new
# code and unit, restarts ONLY x1-ec2-keys, then starts Caddy. Other services are not touched.
set -eu
HOST=${1:?hostname required}
S=$HOME/x1-ec2-keys-stage/tools/ec2-key-registrar
ACCOUNT_ID=$(TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60'); curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/dynamic/instance-identity/document | sed -n 's/.*"accountId" *: *"\([0-9]*\)".*/\1/p')

(cd "$S" && node scripts/check-identity.mjs)   # must print two 'pass' lines, else stop here

sudo install -d -m 0700 -o root -g root /etc/x1-ec2-keys
printf 'X1_REGISTRAR_ROLE_ARN=arn:aws:iam::%s:role/x1-ec2-key-registrar\nX1_LIFECYCLE_ROLE_ARN=arn:aws:iam::%s:role/x1-ec2-key-lifecycle\n' "$ACCOUNT_ID" "$ACCOUNT_ID" | sudo tee /etc/x1-ec2-keys/env >/dev/null
for name in proxy.secret proxy-preview.secret; do
  [ -s /etc/x1-ec2-keys/$name ] || openssl rand -hex 32 | sudo tee /etc/x1-ec2-keys/$name >/dev/null
  sudo chown x1-ec2-keys:x1-ec2-keys /etc/x1-ec2-keys/$name; sudo chmod 0600 /etc/x1-ec2-keys/$name
done

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
echo "loopback /health without HMAC (expect 401): $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8790/health)"

sudo install -d -m 0755 /var/log/caddy && sudo chown caddy:caddy /var/log/caddy
sed "s/KEYS_HOST/$HOST/" "$S/deploy/Caddyfile.template" | sudo tee /etc/caddy/Caddyfile >/dev/null
caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sleep 20
echo "public /health without HMAC (expect 401): $(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/health")"
echo "Rollback: sudo systemctl disable --now caddy; restore /opt/x1-ec2-keys.prev-$STAMP and its unit, then restart x1-ec2-keys."
