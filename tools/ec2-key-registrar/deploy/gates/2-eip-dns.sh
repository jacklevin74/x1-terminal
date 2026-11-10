#!/bin/sh
# GATE 2 (Elastic IP + DNS). Usage: sh 2-eip-dns.sh keys-api.<your-domain> [--with-eip]
# WARNING --with-eip: associating an Elastic IP REPLACES the instance's current public IP. Live services on this
# instance (live-copy-023a and other copybot/sim services) lose open outbound connections (websockets reconnect)
# and anything allowlisting the old IP breaks; SSH known_hosts entries keyed by IP change. Do it in a quiet window.
set -eu
export AWS_PAGER="" AWS_REGION=us-east-2
HOST=${1:?hostname required}; INSTANCE=i-0aa2a040d308a7e9d
if [ "${2:-}" = "--with-eip" ]; then
  ALLOC=$(aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=x1-ec2-keys}]' --query AllocationId --output text)
  aws ec2 associate-address --instance-id "$INSTANCE" --allocation-id "$ALLOC" --query AssociationId --output text
fi
IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "Create this DNS record at the DNS provider of $HOST (x1.xyz is on Route 53 nameservers outside this AWS account):"
echo "  $HOST.  300  IN  A  $IP"
echo "Then wait until:  dig +short $HOST  prints $IP"
