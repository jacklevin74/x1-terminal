// Vercel supplies the IP-country header. Do not cache a user's location decision.
export default function jurisdiction(req, res) {
 res.setHeader("Cache-Control", "private, no-store, max-age=0");
 res.setHeader("Vercel-CDN-Cache-Control", "no-store");
 res.setHeader("Content-Type", "application/json");
 if (req.method !== "GET") { res.setHeader("Allow", "GET"); res.statusCode = 405; res.end(JSON.stringify({ error: "Method not allowed" })); return; }
 const value = req.headers["x-vercel-ip-country"];
 const country = typeof value === "string" && /^[a-z]{2}$/i.test(value) ? value.toUpperCase() : null;
 // US is always restricted. Operators can configure additional ISO country codes.
 const restrictedCountries = new Set(["US", ...(process.env.RESTRICTED_COUNTRIES ?? "").split(",").map(c => c.trim().toUpperCase()).filter(c => /^[A-Z]{2}$/.test(c))]);
 res.statusCode = 200;
 res.end(JSON.stringify({ country, restricted: country !== null && restrictedCountries.has(country) }));
};
