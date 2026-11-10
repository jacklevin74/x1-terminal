import {KMSClient,CreateKeyCommand,GetPublicKeyCommand} from '@aws-sdk/client-kms';
import {fromTemporaryCredentials,fromInstanceMetadata} from '@aws-sdk/credential-providers';
export function kmsAdapter(roleArn){
 if(!/^arn:aws:iam::\d{12}:role\/x1-ec2-key-registrar$/.test(roleArn??''))throw Error('Registrar role is not configured');
 if(process.env.AWS_ACCESS_KEY_ID||process.env.AWS_SECRET_ACCESS_KEY)throw Error('Static credentials are not permitted');
 const credentials=fromTemporaryCredentials({masterCredentials:fromInstanceMetadata({timeout:2000,maxRetries:1}),params:{RoleArn:roleArn,RoleSessionName:'x1-ec2-keys',DurationSeconds:3600},clientConfig:{region:'us-east-2'}});
 const client=new KMSClient({region:'us-east-2',maxAttempts:1,credentials});
 return {verifyIdentity:()=>credentials(),async create({id,request,owner}){
  const out=await client.send(new CreateKeyCommand({KeySpec:'ECC_SECG_P256K1',KeyUsage:'SIGN_VERIFY',MultiRegion:false,Description:'X1 Terminal EC2 managed API key; creation only',Tags:[{TagKey:'app',TagValue:'x1-terminal'},{TagKey:'purpose',TagValue:'ec2-api-key'},{TagKey:'env',TagValue:'dev'},{TagKey:'owner',TagValue:owner},{TagKey:'record',TagValue:id},{TagKey:'request',TagValue:request}]}));
  return {arn:out.KeyMetadata?.Arn,requestId:out.$metadata?.requestId};
 },async publicKey(arn){const out=await client.send(new GetPublicKeyCommand({KeyId:arn}));return {spki:out.PublicKey,spec:out.KeySpec,usage:out.KeyUsage};}};
}
