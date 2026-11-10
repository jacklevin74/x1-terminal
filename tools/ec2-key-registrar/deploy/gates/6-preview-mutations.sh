#!/bin/sh
# GATE 6 helper, ON EC2. 'on' lets the PREVIEW deployment create/manage keys for the single real test;
# 'off' reverts to status-only previews. Verify: systemctl show x1-ec2-keys -p Environment | grep -c PREVIEW
set -eu
case "${1:?on|off}" in
 on)  sudo install -d /etc/systemd/system/x1-ec2-keys.service.d
      printf '[Service]\nEnvironment=X1_PREVIEW_MUTATIONS=1\n' | sudo tee /etc/systemd/system/x1-ec2-keys.service.d/preview-mutations.conf >/dev/null ;;
 off) sudo rm -f /etc/systemd/system/x1-ec2-keys.service.d/preview-mutations.conf ;;
esac
sudo systemctl daemon-reload && sudo systemctl restart x1-ec2-keys && systemctl is-active x1-ec2-keys
