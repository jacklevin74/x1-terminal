#!/bin/sh
# GATE 3 (security group). Opens TCP 443 only. Never 8790. SSH rules are untouched.
# Port 80 is not needed: Caddy uses the TLS-ALPN challenge on 443.
set -eu
export AWS_PAGER="" AWS_REGION=us-east-2
aws ec2 authorize-security-group-ingress --group-id sg-00bdca0dfc33ddd63 \
  --ip-permissions 'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description=x1-ec2-keys HTTPS via Caddy}]' \
  --query 'SecurityGroupRules[].SecurityGroupRuleId' --output text
# Rollback:
#   aws ec2 revoke-security-group-ingress --group-id sg-00bdca0dfc33ddd63 --protocol tcp --port 443 --cidr 0.0.0.0/0
