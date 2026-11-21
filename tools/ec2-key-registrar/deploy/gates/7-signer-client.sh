#!/bin/sh
# GATE 7 (trading-account IAM). Run on the Mac with the TRADING-account admin profile, from the repository root,
# AFTER the signer-account provisioner exists (hl-ws signer/infra/copybot-followers.yaml, docs/terminal-api-wallets.md).
#   sh tools/ec2-key-registrar/deploy/gates/7-signer-client.sh <signer-account-id>
#   sh tools/ec2-key-registrar/deploy/gates/7-signer-client.sh rollback
# - Creates role x1-signer-key-client: trusted only by the EC2 instance role with session name x1-ec2-keys; its only
#   permission is lambda:InvokeFunction on the signer-account key provisioner.
# - Does NOT modify copybot-kms-shadow-signer: same-account trust in the new role is enough for AssumeRole.
set -eu
export AWS_PAGER="" AWS_REGION=us-east-2
D=tools/ec2-key-registrar/deploy
if [ "${1:-}" = "rollback" ]; then
  aws iam delete-role-policy --role-name x1-signer-key-client --policy-name invoke-key-provisioner-only || true
  aws iam delete-role --role-name x1-signer-key-client
  echo "Role removed. The service then reports new-key creation as unavailable; legacy key lifecycle is unaffected."
  exit 0
fi
SIGNER_ACCOUNT_ID=${1:?signer account id required}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
[ "$ACCOUNT_ID" != "$SIGNER_ACCOUNT_ID" ] || { echo "Run this with the TRADING-account profile"; exit 1; }
T=$(mktemp -d)
sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" "$D/signer-client-trust-policy.json" > "$T/trust.json"
sed "s/SIGNER_ACCOUNT_ID/$SIGNER_ACCOUNT_ID/g" "$D/signer-client-policy.json" > "$T/policy.json"
aws iam create-role --role-name x1-signer-key-client --max-session-duration 3600 \
  --description "X1 Terminal /api_keys: invoke the signer-account key provisioner only" \
  --assume-role-policy-document "file://$T/trust.json" --query Role.RoleName --output text
aws iam put-role-policy --role-name x1-signer-key-client --policy-name invoke-key-provisioner-only --policy-document "file://$T/policy.json"
echo "--- simulation (expect allowed, then explicitDeny x3)"
R="arn:aws:iam::$ACCOUNT_ID:role/x1-signer-key-client"
aws iam simulate-principal-policy --policy-source-arn "$R" --action-names lambda:InvokeFunction \
  --resource-arns "arn:aws:lambda:us-east-2:$SIGNER_ACCOUNT_ID:function:hl-copybot-provisioner" \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
aws iam simulate-principal-policy --policy-source-arn "$R" --action-names kms:Sign kms:CreateKey sts:AssumeRole \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
rm -rf "$T"
echo "Done. Give the role ARN to the signer-account stack as TerminalKeysRoleArn."
