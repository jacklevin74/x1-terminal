import {createServer} from 'node:http';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {KMSClient} from '@aws-sdk/client-kms';
import {STSClient,GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {createKeysDemoService} from '../src/keys-demo-service.js';
const region='us-east-2';
const sts=new STSClient({region,maxAttempts:2});
try{const result=await sts.send(new GetCallerIdentityCommand({}));if(result.Account!=='938952892987')throw Error('Unexpected AWS project');}finally{sts.destroy();}
await mkdir('artifacts',{recursive:true,mode:0o700});
const stateFile='artifacts/keys-demo-state.json';let rows=[];
try{rows=JSON.parse(await readFile(stateFile,'utf8'));if(!Array.isArray(rows))throw Error('Invalid local state');}catch(e){if(e.code!=='ENOENT')throw e;}
const kms=new KMSClient({region,maxAttempts:2});
const service=createKeysDemoService({kms,rows,save:async records=>{await writeFile(stateFile+'.tmp',JSON.stringify(records,null,2),{mode:0o600});await rename(stateFile+'.tmp',stateFile);}});
const origins=new Set(['http://127.0.0.1:4173','http://localhost:4173','http://127.0.0.1:5173','http://localhost:5173']);
const server=createServer(async(req,res)=>{
 res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');
 try{
  if(req.headers.host!=='127.0.0.1:8789'||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))throw Error('Loopback requests only');
  if(req.headers.origin&&!origins.has(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site')throw Error('Origin rejected');
  const url=new URL(req.url,'http://127.0.0.1:8789');if(url.pathname!=='/api/local-keys')throw Error('Unknown path');
  let body;
  if(req.method==='GET'&&url.searchParams.get('op')==='status')body=Object.fromEntries(url.searchParams);
  else{
   if(req.method!=='POST'||!origins.has(req.headers.origin)||req.headers['x-local-keys-token']!==service.token||!req.headers['content-type']?.startsWith('application/json'))throw Error('Local demo session required');
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw Error('Request too large');}body=JSON.parse(raw);
  }
  res.end(JSON.stringify(await service.run(url.searchParams.get('op'),body)));
 }catch(error){res.statusCode=400;res.end(JSON.stringify({error:['ExpiredTokenException','CredentialsProviderError','TokenRefreshRequired'].includes(error.name)?'AWS session expired. Refresh aws-toolkit login.':error.$metadata?`AWS request failed (${error.name})`:String(error.message).slice(0,180)}));}
});
server.listen(8789,'127.0.0.1',()=>console.log('Local keys demo listening on 127.0.0.1:8789; no Hyperliquid exchange transport.'));
let stopping=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(stopping)return;stopping=true;await new Promise(resolve=>server.close(resolve));try{await service.cleanup();kms.destroy();process.exit(0);}catch{console.error('Cleanup incomplete; use artifacts/keys-demo-state.json to recover test keys.');process.exit(1);}});
