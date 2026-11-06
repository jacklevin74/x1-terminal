import {randomBytes,randomUUID} from 'node:crypto';
import {CreateKeyCommand,GetPublicKeyCommand,ScheduleKeyDeletionCommand} from '@aws-sdk/client-kms';
import {TypedDataEncoder,getAddress,isAddress,recoverAddress} from 'ethers';
import {KmsSigner,addressFromSpki} from './kms-signer.js';

// Local demo only. Approval/registration are simulated; this module has no exchange transport.
export function createKeysDemoService({kms,save=async()=>{},rows=[]}){
 const records=rows,token=randomBytes(32).toString('hex');
 const publicRow=({keyId,...row})=>row;
 const status=(owner,account)=>({version:1,supported:true,mode:'local-demo',owner,account,region:'us-east-2',canCreate:records.length<3,csrf:token,agents:records.filter(r=>r.owner===owner&&r.account===account).map(({owner,account,...r})=>publicRow(r))});
 let busy=false;
 return {token,async run(op,body){
  if(!isAddress(body.owner)||!isAddress(body.account))throw Error('Valid demo owner/account required');
  const owner=getAddress(body.owner),account=getAddress(body.account);
  if(op==='status')return status(owner,account);
  if(busy)throw Error('Another local demo operation is in progress');busy=true;
  try{
   if(op==='create'){
    if(records.length>=3)throw Error('Delete a test agent first (three-agent local limit)');
    if(typeof body.name!=='string'||! /^[\w -]{1,24}$/.test(body.name)||![7,30,90].includes(body.days)||!['kms','mock'].includes(body.provider))throw Error('Invalid demo agent settings');
    let keyId,agent;
    if(body.provider==='kms'){
     const created=await kms.send(new CreateKeyCommand({KeySpec:'ECC_SECG_P256K1',KeyUsage:'SIGN_VERIFY',MultiRegion:false,Description:'X1 Terminal local keys demo; never approved for trading',Tags:[{TagKey:'app',TagValue:'autotrader'},{TagKey:'env',TagValue:'dev'},{TagKey:'purpose',TagValue:'terminal-keys-demo'}]}));
     keyId=created.KeyMetadata?.Arn;if(!keyId)throw Error('KMS key ARN missing');
     // Persist before reading public metadata so an interrupted create remains recoverable.
     const pending={id:randomUUID(),owner,account,agent:'0x'+randomBytes(20).toString('hex'),keyId,name:body.name,provider:'kms',state:'disabled',createdAt:Date.now(),validUntil:null,lastSignedAt:null};
     records.push(pending);await save(records);
     try{agent=addressFromSpki((await kms.send(new GetPublicKeyCommand({KeyId:keyId}))).PublicKey);}
     catch(error){try{await kms.send(new ScheduleKeyDeletionCommand({KeyId:keyId,PendingWindowInDays:7}));records.splice(records.indexOf(pending),1);await save(records);}catch{}throw error;}
     Object.assign(pending,{agent,state:'awaiting_approval',validUntil:Date.now()+body.days*86400000});
    }else{
     agent='0x'+randomBytes(20).toString('hex');
     records.push({id:randomUUID(),owner,account,agent:getAddress(agent),name:body.name,provider:'mock',state:'awaiting_approval',createdAt:Date.now(),validUntil:Date.now()+body.days*86400000,lastSignedAt:null});
    }
    await save(records);return status(owner,account);
   }
   const row=records.find(r=>r.id===body.id&&r.owner===owner&&r.account===account);if(!row)throw Error('Demo agent does not belong to this account');
   let proof;
   if(op==='approve'){if(row.state==='disabled'||row.validUntil<=Date.now())throw Error('Agent is disabled or expired');row.state='approved';}
   else if(op==='register'){if(row.state!=='approved'||row.validUntil<=Date.now())throw Error('Simulate owner approval first');row.state='paused';}
   else if(op==='sign'){
    if(row.state==='disabled')throw Error('Agent disabled');
    if(row.provider==='mock')throw Error('Choose AWS KMS to test a real signature');
    const domain={name:'X1RemoteKeysDemo',version:'1',chainId:1337};
    const types={Proof:[{name:'account',type:'address'},{name:'challenge',type:'bytes32'},{name:'timestamp',type:'uint64'}]};
    const message={account,challenge:'0x'+randomBytes(32).toString('hex'),timestamp:Date.now()};
    const digest=TypedDataEncoder.hash(domain,types,message),start=performance.now();
    const signer=await KmsSigner.connect(kms,row.keyId,row.agent),signature=await signer.signDigest(digest);
    const recovered=recoverAddress(digest,signature);if(getAddress(recovered)!==getAddress(row.agent))throw Error('Signature verification failed');
    row.lastSignedAt=Date.now();proof={verified:true,provider:'kms',domain,types,message,digest,signature,recovered,ms:Math.round(performance.now()-start)};
   }else if(op==='remove'){
    if(row.keyId)await kms.send(new ScheduleKeyDeletionCommand({KeyId:row.keyId,PendingWindowInDays:7}));
    records.splice(records.indexOf(row),1);
   }else throw Error('Unknown local demo operation');
   await save(records);return {...status(owner,account),...(proof?{proof}:{})};
  }finally{busy=false;}
 },async cleanup(){
  for(const row of [...records]){if(row.keyId)await kms.send(new ScheduleKeyDeletionCommand({KeyId:row.keyId,PendingWindowInDays:7}));records.splice(records.indexOf(row),1);await save(records);}
 }};
}
