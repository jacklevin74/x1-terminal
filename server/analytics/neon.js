// Neon's SQL-over-HTTP transport. Queries use numbered parameters; credentials
// stay in the server-only connection header and are never returned to clients.
export function neonDatabaseUrl(){return process.env.ANALYTICS_DATABASE_URL || process.env.DATABASE_URL;}
function endpoint(connectionString){
 let url;try{url=new URL(connectionString);}catch{throw new Error("Set DATABASE_URL to your Neon PostgreSQL connection string.");}
 if(!["postgres:","postgresql:"].includes(url.protocol)||!url.username||!url.password||!/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(url.hostname))throw new Error("Use a Neon PostgreSQL DATABASE_URL.");
 return `https://${url.hostname.replace(/^[^.]+\./,"api.")}/sql`;
}
export async function neonQuery(query,params=[],{databaseUrl=neonDatabaseUrl(),fetcher=fetch}={}){
 const target=endpoint(databaseUrl);let response;
 try{response=await fetcher(target,{method:"POST",headers:{"Content-Type":"application/json","Neon-Connection-String":databaseUrl,"Neon-Raw-Text-Output":"true","Neon-Array-Mode":"true"},body:JSON.stringify({query,params}),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(20000)});}catch{throw new Error("Neon analytics storage is unavailable.");}
 const data=await response.json().catch(()=>null);
 if(!response.ok || !Array.isArray(data?.rows)){const error=new Error("Neon analytics query failed.");error.code=data?.code;throw error;}
 return data.rows;
}
const schema=`CREATE TABLE IF NOT EXISTS x1_analytics_snapshots (
 builder text PRIMARY KEY,
 collected_at timestamptz NOT NULL,
 snapshot jsonb NOT NULL
)`;
export async function readNeonSnapshot(builder,options){
 try{const rows=await neonQuery("SELECT snapshot::text FROM x1_analytics_snapshots WHERE builder = $1",[builder],options);return rows.length?JSON.parse(rows[0][0]):null;}
 catch(error){if(error.code==="42P01")return null;throw error;}
}
export async function writeNeonSnapshot(snapshot,options){
 await neonQuery(schema,[],options);
 const rows=await neonQuery(`INSERT INTO x1_analytics_snapshots (builder, collected_at, snapshot)
 VALUES ($1, $2::timestamptz, $3::jsonb)
 ON CONFLICT (builder) DO UPDATE SET collected_at = EXCLUDED.collected_at, snapshot = EXCLUDED.snapshot
 WHERE x1_analytics_snapshots.collected_at <= EXCLUDED.collected_at
 RETURNING snapshot::text`,[snapshot.builder,snapshot.collection?.collectedAt || snapshot.createdAt,JSON.stringify(snapshot)],options);
 return rows.length?JSON.parse(rows[0][0]):null;
}
