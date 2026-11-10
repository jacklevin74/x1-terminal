#!/bin/sh
# GATE 1 (IAM). Run on the Mac with an AWS admin profile, from the repository root.
# - Replaces the registrar's inline policy: removes kms:PutKeyPolicy, requires env=prod, read-only on its own keys.
# - Creates role x1-ec2-key-lifecycle. Its IAM policy only DENIES; each key's own key policy (set at CreateKey)
#   is the only grant, so it can never reach alias/copybot-shadow or any key the registrar did not create.
# - Does NOT modify copybot-kms-shadow-signer (see the optional step at the end).
set -eu
export AWS_PAGER="" AWS_REGION=us-east-2
D=tools/ec2-key-registrar/deploy
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
T=$(mktemp -d)
for f in registrar-policy lifecycle-policy lifecycle-trust-policy; do sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" "$D/$f.json" > "$T/$f.json"; done

# Keep a copy of the live policy for rollback (stays local, not committed).
aws iam get-role-policy --role-name x1-ec2-key-registrar --policy-name create-ec2-api-keys-only --query PolicyDocument --output json > "$D/registrar-policy.live-backup.json"

aws iam create-role --role-name x1-ec2-key-lifecycle --max-session-duration 3600 \
  --description "X1 Terminal: disable/enable/schedule-delete/cancel-delete of registrar-created KMS keys only" \
  --assume-role-policy-document "file://$T/lifecycle-trust-policy.json" --query Role.RoleName --output text
aws iam put-role-policy --role-name x1-ec2-key-lifecycle --policy-name lifecycle-guardrails --policy-document "file://$T/lifecycle-policy.json"
aws iam put-role-policy --role-name x1-ec2-key-registrar --policy-name create-ec2-api-keys-only --policy-document "file://$T/registrar-policy.json"

echo "--- simulation (expect explicitDeny for every row except CreateKey=allowed)"
R="arn:aws:iam::$ACCOUNT_ID:role/x1-ec2-key-registrar"
aws iam simulate-principal-policy --policy-source-arn "$R" \
  --action-names kms:Sign kms:PutKeyPolicy kms:DisableKey kms:ScheduleKeyDeletion kms:CreateGrant kms:Decrypt \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
aws iam simulate-principal-policy --policy-source-arn "$R" --action-names kms:CreateKey \
  --context-entries \
   ContextKeyName=aws:RequestedRegion,ContextKeyValues=us-east-2,ContextKeyType=string \
   ContextKeyName=kms:KeySpec,ContextKeyValues=ECC_SECG_P256K1,ContextKeyType=string \
   ContextKeyName=kms:KeyUsage,ContextKeyValues=SIGN_VERIFY,ContextKeyType=string \
   ContextKeyName=kms:KeyOrigin,ContextKeyValues=AWS_KMS,ContextKeyType=string \
   ContextKeyName=kms:MultiRegion,ContextKeyValues=false,ContextKeyType=boolean \
   ContextKeyName=aws:RequestTag/app,ContextKeyValues=x1-terminal,ContextKeyType=string \
   ContextKeyName=aws:RequestTag/purpose,ContextKeyValues=ec2-api-key,ContextKeyType=string \
   ContextKeyName=aws:RequestTag/env,ContextKeyValues=prod,ContextKeyType=string \
   ContextKeyName=aws:TagKeys,ContextKeyValues=app,purpose,env,owner,record,request,ContextKeyType=stringList \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
L="arn:aws:iam::$ACCOUNT_ID:role/x1-ec2-key-lifecycle"
aws iam simulate-principal-policy --policy-source-arn "$L" --action-names kms:Sign kms:PutKeyPolicy kms:DisableKey kms:ScheduleKeyDeletion \
  --resource-arns "arn:aws:kms:us-east-2:$ACCOUNT_ID:key/00000000-0000-0000-0000-000000000000" \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
rm -rf "$T"
echo "Done. IAM changes can take a few seconds to propagate."

# OPTIONAL — only if scripts/check-identity.mjs on EC2 reports 'x1-ec2-key-lifecycle: FAIL (AccessDenied)'.
# This edits the inline policy of the instance role copybot-kms-shadow-signer (adds AssumeRole on the lifecycle role).
# It does not touch that role's Sign policy, but it IS a change to the copybot role: decide explicitly.
#   sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" $D/instance-assume-policy.with-lifecycle.json > /tmp/assume.json
#   aws iam put-role-policy --role-name copybot-kms-shadow-signer --policy-name assume-x1-ec2-key-registrar --policy-document file:///tmp/assume.json
