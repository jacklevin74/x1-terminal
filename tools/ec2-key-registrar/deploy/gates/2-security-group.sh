#!/bin/sh
# GATE 2 (security group). Run on the Mac.  sh 2-security-group.sh [rollback]
# Creates a DEDICATED group "x1-ec2-keys-cloudfront" allowing TCP 80 only from the AWS-managed prefix list
# com.amazonaws.global.cloudfront.origin-facing, and adds it to the instance next to hl-ws-test-ssh.
# Why a separate group: that prefix list counts as ~55 rules against the 60-inbound-rules quota, and
# hl-ws-test-ssh already has 7 inbound rules (7 + 55 > 60). Never 0.0.0.0/0, never 8790; SSH rules untouched.
# Adding a security group to a running instance does not interrupt existing connections.
set -eu
export AWS_PAGER="" AWS_REGION=us-east-2
INSTANCE=i-0aa2a040d308a7e9d; SSH_SG=sg-00bdca0dfc33ddd63; NAME=x1-ec2-keys-cloudfront
VPC=$(aws ec2 describe-instances --instance-ids $INSTANCE --query 'Reservations[0].Instances[0].VpcId' --output text)
PL=$(aws ec2 describe-managed-prefix-lists --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing --query 'PrefixLists[0].PrefixListId' --output text)

if [ "${1:-}" = "rollback" ]; then
  SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=$NAME Name=vpc-id,Values=$VPC --query 'SecurityGroups[0].GroupId' --output text)
  KEEP=$(aws ec2 describe-instances --instance-ids $INSTANCE --query 'Reservations[0].Instances[0].SecurityGroups[].GroupId' --output text | tr '\t' '\n' | grep -v "^$SG$" | tr '\n' ' ')
  aws ec2 modify-instance-attribute --instance-id $INSTANCE --groups $KEEP
  aws ec2 delete-security-group --group-id "$SG"
  aws ec2 describe-instances --instance-ids $INSTANCE --query 'Reservations[0].Instances[0].SecurityGroups[].GroupName' --output text
  exit 0
fi

echo "prefix list: $PL"   # expected pl-b6a144df in us-east-2
SG=$(aws ec2 create-security-group --group-name $NAME --vpc-id "$VPC" \
  --description "x1-ec2-keys origin: HTTP 80 from CloudFront origin-facing only" \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$NAME}]" --query GroupId --output text)
aws ec2 revoke-security-group-egress --group-id "$SG" --ip-permissions 'IpProtocol=-1,IpRanges=[{CidrIp=0.0.0.0/0}]' >/dev/null  # inbound-only group; hl-ws-test-ssh keeps the instance's egress
aws ec2 authorize-security-group-ingress --group-id "$SG" \
  --ip-permissions "IpProtocol=tcp,FromPort=80,ToPort=80,PrefixListIds=[{PrefixListId=$PL,Description=CloudFront origin-facing}]" \
  --query 'SecurityGroupRules[].SecurityGroupRuleId' --output text
CURRENT=$(aws ec2 describe-instances --instance-ids $INSTANCE --query 'Reservations[0].Instances[0].SecurityGroups[].GroupId' --output text)
aws ec2 modify-instance-attribute --instance-id $INSTANCE --groups $CURRENT "$SG"

echo "--- verify (expect the two groups, and one inbound rule: tcp 80 from $PL)"
aws ec2 describe-instances --instance-ids $INSTANCE --query 'Reservations[0].Instances[0].SecurityGroups[].GroupName' --output text
aws ec2 describe-security-groups --group-ids "$SG" --query 'SecurityGroups[0].IpPermissions[].[IpProtocol,FromPort,PrefixListIds[0].PrefixListId,length(IpRanges)]' --output text
aws ec2 describe-security-groups --group-ids $SSH_SG --query 'SecurityGroups[0].IpPermissions[].[FromPort,length(IpRanges)]' --output text   # unchanged: 22 x6, 8088 x1
