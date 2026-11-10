import {createServer} from 'node:http';
import {createService,RequestError} from './service.js';
import {kmsAdapter} from './kms.js';
process.umask(0o077);
const kms=kmsAdapter(process.env.X1_REGISTRAR_ROLE_ARN);
await kms.verifyIdentity(); // Resolve temporary credentials without creating or signing a key.
const service=createService({file:process.env.X1_KEYS_DB??'/var/lib/x1-ec2-keys/keys.sqlite',kms});
const origins=new Set(['http://127.0.0.1:4173','http://localhost:4173']);
const reply=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
const server=createServer(async(req,res)=>{
 try{
  const origin=req.headers.origin;
  if(origin&&!origins.has(origin))throw new RequestError(403,'This endpoint is available only to the local terminal.');
  if(req.headers['sec-fetch-site']==='cross-site')throw new RequestError(403,'Cross-site requests are not accepted.');
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='GET'&&url.pathname==='/health')return reply(res,200,{supported:true,region:'us-east-2',service:'ec2-key-registrar',capabilities:{create:true,sign:false,register:false}});
  if(url.pathname!=='/api/ec2-keys')throw new RequestError(404,'No route.');
  const op=url.searchParams.get('op'),owner=url.searchParams.get('owner');
  if(req.method==='GET'&&op==='status')return reply(res,200,service.status(owner));
  if(req.method==='GET'&&op==='nonce')return reply(res,200,service.nonce(owner));
  if(req.method==='POST'&&op==='create'){
   if(!origin||req.headers['content-type']?.split(';')[0]!=='application/json')throw new RequestError(403,'A local origin and JSON body are required.');
   let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>4096)throw new RequestError(413,'Request too large.');}
   return reply(res,200,await service.create(owner,raw,req.headers['x-auth']));
  }
  throw new RequestError(405,'Operation is not supported.');
 }catch(error){reply(res,error instanceof RequestError?error.status:500,{error:error instanceof RequestError?error.message:'Key service request failed.'});}
});
server.requestTimeout=15000;server.headersTimeout=10000;server.listen(8790,'127.0.0.1',()=>console.log('EC2 key registrar ready on loopback; no signing or exchange routes.'));
process.on('SIGTERM',()=>server.close(()=>{service.close();process.exit(0);}));
