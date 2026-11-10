#!/bin/sh
set -eu
exec ssh -N -o BatchMode=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
 -i "${X1_EC2_SSH_KEY:-$HOME/.ssh/hl-ws-test-us-east-2.pem}" \
 -o "UserKnownHostsFile=$HOME/.ssh/known_hosts_hlws" \
 -L 127.0.0.1:18790:127.0.0.1:8790 ubuntu@13.184.21.180
