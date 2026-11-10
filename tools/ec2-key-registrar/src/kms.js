import {KMSClient,CreateKeyCommand,GetPublicKeyCommand,DisableKeyCommand,EnableKeyCommand,ScheduleKeyDeletionCommand,CancelKeyDeletionCommand} from '@aws-sdk/client-kms';
import {STSClient,GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {fromTemporaryCredentials,fromInstanceMetadata} from '@aws-sdk/credential-providers';

export const REGION='us-east-2';
export const SESSION_NAME='x1-ec2-keys';
const ROLE=/^arn:aws:iam::(\d{12}):role\/(x1-ec2-key-registrar|x1-ec2-key-lifecycle)$/;

export class KmsDenied extends Error {}
export class KmsState extends Error {}
/** AWS definitively refused CreateKey (validation or permission): no key exists, nothing is billable. */
export class KmsRejected extends Error {}
const DEFINITE_CREATE_FAILURES=new Set(['AccessDeniedException','MalformedPolicyDocumentException','TagException','ValidationException','InvalidArnException','UnsupportedOperationException','LimitExceededException']);

export function parseRole(arn,name){
 const match=ROLE.exec(arn??'');
 if(!match||match[2]!==name)throw Error(`Role ${name} is not configured`);
 return {arn,account:match[1],name};
}
/** Throws unless the caller identity is the expected assumed role in the expected account. */
export function checkIdentity(identity,role){
 if(identity?.Account!==role.account||identity?.Arn!==`arn:aws:sts::${role.account}:assumed-role/${role.name}/${SESSION_NAME}`)throw Error(`KMS identity check failed for ${role.name}`);
 return true;
}
/**
 * Key policy set at CreateKey time, so the registrar never needs kms:PutKeyPolicy.
 * Statement 1 keeps IAM in control (required for the policy lockout safety check).
 * Statement 2 is the only grant the lifecycle role has: its IAM policy contains no KMS Allow,
 * so tagging some other key can never bring it into the lifecycle role's reach.
 */
export function keyPolicy(account,lifecycleRoleArn){
 return JSON.stringify({Version:'2012-10-17',Id:'x1-terminal-ec2-api-key',Statement:[
  {Sid:'EnableIamPolicies',Effect:'Allow',Principal:{AWS:`arn:aws:iam::${account}:root`},Action:'kms:*',Resource:'*'},
  {Sid:'LifecycleOnly',Effect:'Allow',Principal:{AWS:lifecycleRoleArn},Action:['kms:DescribeKey','kms:DisableKey','kms:EnableKey','kms:CancelKeyDeletion'],Resource:'*'},
  {Sid:'LifecycleScheduleDeletion',Effect:'Allow',Principal:{AWS:lifecycleRoleArn},Action:'kms:ScheduleKeyDeletion',Resource:'*',Condition:{NumericGreaterThanEquals:{'kms:ScheduleKeyDeletionPendingWindowInDays':'7'},NumericLessThanEquals:{'kms:ScheduleKeyDeletionPendingWindowInDays':'30'}}},
 ]});
}
export function keyTags({env,owner,id,request}){
 return [{TagKey:'app',TagValue:'x1-terminal'},{TagKey:'purpose',TagValue:'ec2-api-key'},{TagKey:'env',TagValue:env},{TagKey:'owner',TagValue:owner},{TagKey:'record',TagValue:id},{TagKey:'request',TagValue:request}];
}
const mapError=error=>{
 const name=error?.name??'';
 if(name==='AccessDeniedException'||name==='AccessDenied')return new KmsDenied('AWS refused this key operation.');
 if(name==='KMSInvalidStateException'||name==='DisabledException')return new KmsState('The key is not in a state that allows this change.');
 return error;
};

export function kmsAdapter({registrarRoleArn,lifecycleRoleArn,env='prod'}){
 const registrar=parseRole(registrarRoleArn,'x1-ec2-key-registrar'),lifecycle=parseRole(lifecycleRoleArn,'x1-ec2-key-lifecycle');
 if(registrar.account!==lifecycle.account)throw Error('Roles must be in one account');
 if(!['prod','dev'].includes(env))throw Error('Key env must be prod or dev');
 if(process.env.AWS_ACCESS_KEY_ID||process.env.AWS_SECRET_ACCESS_KEY)throw Error('Static credentials are not permitted');
 const master=fromInstanceMetadata({timeout:2000,maxRetries:1});
 const assume=role=>fromTemporaryCredentials({masterCredentials:master,params:{RoleArn:role.arn,RoleSessionName:SESSION_NAME,DurationSeconds:3600},clientConfig:{region:REGION}});
 const registrarCredentials=assume(registrar),lifecycleCredentials=assume(lifecycle);
 const registrarKms=new KMSClient({region:REGION,maxAttempts:1,credentials:registrarCredentials});
 const lifecycleKms=new KMSClient({region:REGION,maxAttempts:1,credentials:lifecycleCredentials});
 const send=async(client,command)=>{try{return await client.send(command);}catch(error){throw mapError(error);}};
 return {
  async verifyIdentity(){
   for(const [role,credentials] of [[registrar,registrarCredentials],[lifecycle,lifecycleCredentials]]){
    const sts=new STSClient({region:REGION,maxAttempts:1,credentials});
    checkIdentity(await sts.send(new GetCallerIdentityCommand({})),role);
   }
  },
  async create({id,request,owner}){
   let out;try{out=await registrarKms.send(new CreateKeyCommand({KeySpec:'ECC_SECG_P256K1',KeyUsage:'SIGN_VERIFY',MultiRegion:false,Description:'X1 Terminal EC2 managed API key',Policy:keyPolicy(registrar.account,lifecycle.arn),Tags:keyTags({env,owner,id,request})}));}
   catch(error){if(DEFINITE_CREATE_FAILURES.has(error?.name)&&error?.$metadata?.httpStatusCode===400)throw new KmsRejected(error.name);throw error;}
   return {arn:out.KeyMetadata?.Arn,requestId:out.$metadata?.requestId};
  },
  async publicKey(arn){const out=await send(registrarKms,new GetPublicKeyCommand({KeyId:arn}));return {spki:out.PublicKey,spec:out.KeySpec,usage:out.KeyUsage};},
  async disable(arn){await send(lifecycleKms,new DisableKeyCommand({KeyId:arn}));},
  async enable(arn){await send(lifecycleKms,new EnableKeyCommand({KeyId:arn}));},
  async scheduleDeletion(arn,days){const out=await send(lifecycleKms,new ScheduleKeyDeletionCommand({KeyId:arn,PendingWindowInDays:days}));return {deletionDate:out.DeletionDate?new Date(out.DeletionDate).getTime():null};},
  async cancelDeletion(arn){await send(lifecycleKms,new CancelKeyDeletionCommand({KeyId:arn}));},
 };
}
