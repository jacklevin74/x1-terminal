import {createHash,createHmac} from "node:crypto";

// Thin same-origin proxy to the EC2 KMS key service. It has no AWS access.
// It signs each request with EC2_KEYS_PROXY_SECRET so the EC2 endpoint can refuse everything else.
// Production and Preview must use different secrets: the EC2 service grants previews read-only status.
const GET_OPS = new Set(["status", "nonce"]);
const POST_OPS = new Set(["create", "rename", "disable", "enable", "delete", "cancel-delete"]);
const MAX_BODY = 4096;
const TIMEOUT_MS = 20000;
const UNAVAILABLE = "EC2 key service unavailable.";

export function proxyMac(secret, method, pathAndQuery, ts, body) {
 const bodyHash = createHash("sha256").update(body).digest("hex");
 return createHmac("sha256", secret).update(`${method}\n${pathAndQuery}\n${ts}\n${bodyHash}`).digest("hex");
}
function send(res, status, data) {
 res.statusCode = status;
 res.setHeader("Content-Type", "application/json");
 res.setHeader("Cache-Control", "private, no-store, max-age=0");
 res.setHeader("Vercel-CDN-Cache-Control", "no-store");
 res.end(JSON.stringify(data));
}
const first = value => (Array.isArray(value) ? value[0] : value);
function clientIp(req) {
 const value = first(req.headers["x-forwarded-for"]) ?? "";
 const ip = value.split(",")[0].trim();
 return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : undefined;
}
async function readBody(req) {
 const chunks = [];
 let size = 0;
 for await (const part of req) {
  size += part.length;
  if (size > MAX_BODY) return null;
  chunks.push(Buffer.from(part));
 }
 return Buffer.concat(chunks);
}

export function createHandler({ env = process.env, fetcher = globalThis.fetch, now = Date.now } = {}) {
 return async function ec2Keys(req, res) {
  try {
   const url = new URL(req.url ?? "/", "http://proxy.invalid");
   const keys = [...url.searchParams.keys()];
   const op = url.searchParams.get("op") ?? "";
   const owner = url.searchParams.get("owner") ?? "";
   const allowed = (req.method === "GET" && GET_OPS.has(op)) || (req.method === "POST" && POST_OPS.has(op));
   if (!allowed) {
    res.setHeader("Allow", POST_OPS.has(op) ? "POST" : "GET");
    return send(res, 405, { error: "Operation is not supported." });
   }
   if (keys.some(k => k !== "op" && k !== "owner") || !/^0x[0-9a-fA-F]{40}$/.test(owner)) return send(res, 400, { error: "A valid owner address is required." });
   const declared = Number(first(req.headers["content-length"]) ?? 0);
   if (declared > MAX_BODY) return send(res, 413, { error: "Request too large." });
   const body = req.method === "POST" ? await readBody(req) : Buffer.alloc(0);
   if (body === null) return send(res, 413, { error: "Request too large." });
   if (req.method === "POST" && first(req.headers["content-type"])?.split(";")[0].trim() !== "application/json") return send(res, 415, { error: "A JSON body is required." });

   // The page calls this same-origin. Refuse browsers sending a different Origin (CSRF defense).
   const host = first(req.headers["x-forwarded-host"]) ?? first(req.headers.host);
   if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return send(res, 400, { error: "Invalid host." });
   const origin = `${host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"}://${host}`;
   const browserOrigin = first(req.headers.origin);
   if ((browserOrigin && browserOrigin !== origin) || first(req.headers["sec-fetch-site"]) === "cross-site") return send(res, 403, { error: "Cross-site requests are not accepted." });

   const base = env.EC2_KEYS_URL, secretHex = env.EC2_KEYS_PROXY_SECRET;
   if (!base || !/^https:\/\/[a-z0-9.-]+$/i.test(base) || !secretHex || !/^[a-f0-9]{64}$/i.test(secretHex.trim())) return send(res, 503, { error: UNAVAILABLE });
   const pathAndQuery = `/api/ec2-keys?${new URLSearchParams({ op, owner })}`;
   const ts = String(now());
   const headers = {
    Origin: origin,
    "X-Proxy-Ts": ts,
    "X-Proxy-Auth": proxyMac(Buffer.from(secretHex.trim(), "hex"), req.method, pathAndQuery, ts, body),
   };
   const ip = clientIp(req);
   if (ip) headers["X-Forwarded-For"] = ip;
   if (req.method === "POST") {
    headers["Content-Type"] = "application/json";
    const auth = first(req.headers["x-auth"]);
    if (typeof auth === "string" && auth.length <= 1024) headers["X-Auth"] = auth;
   }
   let upstream;
   try {
    upstream = await fetcher(`${base}${pathAndQuery}`, {
     method: req.method,
     headers,
     body: req.method === "POST" ? body : undefined,
     redirect: "error",
     cache: "no-store",
     signal: AbortSignal.timeout(TIMEOUT_MS),
    });
   } catch (error) {
    return send(res, error?.name === "TimeoutError" ? 504 : 502, { error: UNAVAILABLE });
   }
   let data;
   try {
    const text = await upstream.text();
    if (text.length > 65536) throw Error("too large");
    data = JSON.parse(text);
   } catch {
    return send(res, 502, { error: UNAVAILABLE });
   }
   if (!data || typeof data !== "object") return send(res, 502, { error: UNAVAILABLE });
   const status = upstream.status >= 200 && upstream.status <= 599 ? upstream.status : 502;
   return send(res, status, data);
  } catch {
   return send(res, 500, { error: UNAVAILABLE });
  }
 };
}

export default createHandler();
