import {RequestError,MANAGEMENT_OPS} from './service.js';
import {createRateLimiter} from './rate-limit.js';

export const PRODUCTION_ORIGINS=['https://x1-terminal-20261029.vercel.app'];
export const PREVIEW_ORIGIN=/^https:\/\/x1-terminal-20261029-[a-z0-9-]{1,80}-jacklevin74s-projects\.vercel\.app$/;
export const DEV_ORIGINS=['http://localhost:4173','http://127.0.0.1:4173'];
const MAX_BODY=4096;
const POST_OPS=new Set(['create',...MANAGEMENT_OPS]);

const reply=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
const header=(req,name)=>{const v=req.headers[name];return typeof v==='string'?v:undefined;};
const forwarded=req=>(header(req,'x-forwarded-for')??'').split(',').map(v=>v.trim()).filter(Boolean);

/**
 * HTTP handler. Order: size cap → proxy HMAC → origin/tier → per-client limit → route.
 * Nothing reaches the KMS code without a valid, unreplayed proxy signature.
 */
export function createApp({service,verify,production=process.env.NODE_ENV==='production',extraOrigins=[],allowPreviewMutations=false,trustedHops=0,now=Date.now,
 unauthLimit=createRateLimiter({limit:120,windowMs:60_000,now}),clientLimit=createRateLimiter({limit:30,windowMs:60_000,now})}){
 const productionOrigins=new Set([...PRODUCTION_ORIGINS,...extraOrigins]);
 const devOrigins=new Set(production?[]:DEV_ORIGINS);
 return async function handle(req,res){
  try{
   // X-Forwarded-For: [browser (set by the Vercel proxy), …, peer seen by the first trusted hop, trusted hops…].
   // Caddy appends its peer; with CloudFront in front that peer is an edge (trustedHops=1), so the address
   // CloudFront itself saw (Vercel, or an attacker) is the entry just before the trusted hops.
   const hops=forwarded(req),peer=hops.at(-1-trustedHops)??hops[0]??req.socket.remoteAddress??'unknown';
   const chunks=[];let size=0;
   for await(const part of req){size+=part.length;if(size>MAX_BODY)throw new RequestError(413,'Request too large.');chunks.push(part);}
   const body=Buffer.concat(chunks);
   const tier=verify({method:req.method,pathAndQuery:req.url,ts:header(req,'x-proxy-ts'),mac:header(req,'x-proxy-auth'),body});
   if(!tier){if(!unauthLimit(peer))throw new RequestError(429,'Too many requests.');throw new RequestError(401,'Unauthorized.');}
   const origin=header(req,'origin');
   const originOk=origin&&(devOrigins.has(origin)||(tier==='production'?productionOrigins.has(origin):PREVIEW_ORIGIN.test(origin)));
   if(!originOk)throw new RequestError(403,'Origin is not allowed.');
   // The proxy sends the browser's address first; only trusted after the HMAC check above.
   if(!clientLimit(forwarded(req)[0]??peer))throw new RequestError(429,'Too many requests. Slow down.');
   const url=new URL(req.url,'http://127.0.0.1');
   if(url.pathname==='/health'&&req.method==='GET')return reply(res,200,{supported:true,region:'us-east-2',service:'ec2-key-registrar',capabilities:{create:true,manage:true,sign:false,register:false}});
   if(url.pathname!=='/api/ec2-keys')throw new RequestError(404,'No route.');
   if([...url.searchParams.keys()].some(k=>k!=='op'&&k!=='owner'))throw new RequestError(400,'Unsupported query parameter.');
   const op=url.searchParams.get('op'),owner=url.searchParams.get('owner');
   const getOp=op==='status'||op==='nonce',postOp=POST_OPS.has(op);
   if(!(req.method==='GET'&&getOp)&&!(req.method==='POST'&&postOp))throw new RequestError(405,'Operation is not supported.');
   if(tier==='preview'&&op!=='status'&&!allowPreviewMutations)throw new RequestError(403,'Preview deployments can only read key status.');
   if(op==='status')return reply(res,200,service.status(owner));
   if(op==='nonce')return reply(res,200,service.nonce(owner));
   if(header(req,'content-type')?.split(';')[0].trim()!=='application/json')throw new RequestError(415,'A JSON body is required.');
   const raw=body.toString('utf8'),auth=header(req,'x-auth');
   return reply(res,200,op==='create'?await service.create(owner,raw,auth):await service.manage(op,owner,raw,auth));
  }catch(error){
   if(!res.headersSent)reply(res,error instanceof RequestError?error.status:500,{error:error instanceof RequestError?error.message:'Key service request failed.'});
  }
 };
}
