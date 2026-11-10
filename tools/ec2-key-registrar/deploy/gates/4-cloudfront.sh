#!/bin/sh
# GATE 4 (CloudFront). Run on the Mac from the repository root, after gate 3.
#   sh tools/ec2-key-registrar/deploy/gates/4-cloudfront.sh            # create
#   sh tools/ec2-key-registrar/deploy/gates/4-cloudfront.sh rollback   # disable, wait, delete
# Reads the origin-verify secret from EC2 over SSH into a 0600 temp file; it is never printed.
# Note: anyone with cloudfront:GetDistributionConfig can read that header value; rotate it if that is a concern.
set -eu
export AWS_PAGER=""
D=tools/ec2-key-registrar/deploy
SSH="ssh -i $HOME/.ssh/hl-ws-ec2-agent -o UserKnownHostsFile=$HOME/.ssh/known_hosts_hlws -o BatchMode=yes ubuntu@13.184.21.180"
STATE=$D/cloudfront.local.env   # gitignored: distribution id + domain

if [ "${1:-}" = "rollback" ]; then
  . "./$STATE"
  ETAG=$(aws cloudfront get-distribution-config --id "$CF_ID" --query ETag --output text)
  T=$(mktemp -d); chmod 700 "$T"
  aws cloudfront get-distribution-config --id "$CF_ID" --query DistributionConfig --output json > "$T/c.json"
  python3 -c "import json,sys;p=sys.argv[1];c=json.load(open(p));c['Enabled']=False;json.dump(c,open(p,'w'))" "$T/c.json"
  aws cloudfront update-distribution --id "$CF_ID" --if-match "$ETAG" --distribution-config "file://$T/c.json" --query Distribution.Status --output text
  rm -rf "$T"
  aws cloudfront wait distribution-deployed --id "$CF_ID"
  aws cloudfront delete-distribution --id "$CF_ID" --if-match "$(aws cloudfront get-distribution --id "$CF_ID" --query ETag --output text)"
  aws cloudfront delete-origin-request-policy --id "$CF_ORP_ID" --if-match "$(aws cloudfront get-origin-request-policy --id "$CF_ORP_ID" --query ETag --output text)"
  echo "CloudFront distribution and origin request policy deleted."; exit 0
fi

ORIGIN=$(AWS_REGION=us-east-2 aws ec2 describe-instances --instance-ids i-0aa2a040d308a7e9d --query 'Reservations[0].Instances[0].PublicDnsName' --output text)
echo "origin: $ORIGIN"   # expected ec2-13-184-21-180.us-east-2.compute.amazonaws.com
ORP=$(aws cloudfront create-origin-request-policy --origin-request-policy-config "file://$D/cloudfront-origin-request-policy.json" --query OriginRequestPolicy.Id --output text)

T=$(mktemp -d); chmod 700 "$T"; umask 077
VERIFY=$($SSH "sudo sed -n 's/^X1_ORIGIN_VERIFY=//p' /etc/caddy/origin-verify.env")
[ ${#VERIFY} -eq 64 ] || { echo "origin secret missing on EC2; run gate 3 first"; rm -rf "$T"; exit 1; }
sed -e "s/CALLER_REFERENCE/x1-ec2-keys-$(date +%s)/" -e "s/ORIGIN_DOMAIN/$ORIGIN/" -e "s/ORIGIN_REQUEST_POLICY_ID/$ORP/" \
    -e "s/ORIGIN_VERIFY_VALUE/v1:$VERIFY/" "$D/cloudfront-distribution.template.json" > "$T/dist.json"
unset VERIFY
OUT=$(aws cloudfront create-distribution --distribution-config "file://$T/dist.json" --query '[Distribution.Id,Distribution.DomainName]' --output text)
rm -rf "$T"
CF_ID=$(echo "$OUT" | cut -f1); CF_DOMAIN=$(echo "$OUT" | cut -f2)
printf 'CF_ID=%s\nCF_DOMAIN=%s\nCF_ORP_ID=%s\n' "$CF_ID" "$CF_DOMAIN" "$ORP" > "$STATE"
echo "distribution $CF_ID → https://$CF_DOMAIN (deploying, usually 3-10 minutes)"
aws cloudfront wait distribution-deployed --id "$CF_ID"

echo "--- verify"
echo "https://$CF_DOMAIN/health without HMAC (expect 401): $(curl -s -o /dev/null -w '%{http_code}' "https://$CF_DOMAIN/health")"
echo "http:// is refused (expect 403):                        $(curl -s -o /dev/null -w '%{http_code}' "http://$CF_DOMAIN/health")"
echo "other path (expect 404):                                $(curl -s -o /dev/null -w '%{http_code}' "https://$CF_DOMAIN/")"
echo "direct origin from this Mac (expect 000 = blocked):     $(curl -s -m 5 -o /dev/null -w '%{http_code}' "http://$ORIGIN/health" || true)"
