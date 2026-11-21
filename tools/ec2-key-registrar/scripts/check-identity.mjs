// Run on EC2 before restarting the service: confirms the instance can assume the lifecycle role (legacy keys) and
// x1-signer-key-client (signer-account provisioner). Prints pass/fail only (no ARNs or credentials).
// Creates, changes, invokes and signs nothing.
import {STSClient,GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {fromTemporaryCredentials,fromInstanceMetadata} from '@aws-sdk/credential-providers';
import {checkIdentity,SESSION_NAME,REGION} from '../src/kms.js';
const master=fromInstanceMetadata({timeout:2000,maxRetries:1});
const account=(await new STSClient({region:REGION,credentials:master}).send(new GetCallerIdentityCommand({}))).Account;
let ok=true;
for(const name of ['x1-ec2-key-lifecycle','x1-signer-key-client']){
 const role={arn:`arn:aws:iam::${account}:role/${name}`,account,name};
 try{
  const credentials=fromTemporaryCredentials({masterCredentials:master,params:{RoleArn:role.arn,RoleSessionName:SESSION_NAME,DurationSeconds:900},clientConfig:{region:REGION}});
  checkIdentity(await new STSClient({region:REGION,credentials}).send(new GetCallerIdentityCommand({})),role);console.log(`${name}: pass`);
 }catch(error){ok=false;console.log(`${name}: FAIL (${error?.name??'error'})`);}
}
process.exit(ok?0:1);
