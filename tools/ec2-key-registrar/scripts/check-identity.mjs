// Run on EC2 before restarting the service: confirms the instance can assume both roles.
// Prints pass/fail only (no ARNs or credentials). Creates, changes and signs nothing.
import {STSClient,GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {fromTemporaryCredentials,fromInstanceMetadata} from '@aws-sdk/credential-providers';
import {parseRole,checkIdentity,SESSION_NAME,REGION} from '../src/kms.js';
const master=fromInstanceMetadata({timeout:2000,maxRetries:1});
const account=(await new STSClient({region:REGION,credentials:master}).send(new GetCallerIdentityCommand({}))).Account;
let ok=true;
for(const name of ['x1-ec2-key-registrar','x1-ec2-key-lifecycle']){
 const role=parseRole(`arn:aws:iam::${account}:role/${name}`,name);
 try{
  const credentials=fromTemporaryCredentials({masterCredentials:master,params:{RoleArn:role.arn,RoleSessionName:SESSION_NAME,DurationSeconds:900},clientConfig:{region:REGION}});
  checkIdentity(await new STSClient({region:REGION,credentials}).send(new GetCallerIdentityCommand({})),role);console.log(`${name}: pass`);
 }catch(error){ok=false;console.log(`${name}: FAIL (${error?.name??'error'})`);}
}
process.exit(ok?0:1);
