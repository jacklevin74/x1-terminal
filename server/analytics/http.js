import { readFile } from "node:fs/promises";
import analyticsUpdate from "../../api/analytics-update.js";
import builderUsers from "../../api/builder-users.js";
const assets={
 "/dashboard-view.js":["dashboard-view.js","text/javascript; charset=utf-8"],
 "/analytics-portfolio.js":["portfolio.js","text/javascript; charset=utf-8"],
 "/":["dashboard.html","text/html; charset=utf-8"],
 "/analytics":["dashboard.html","text/html; charset=utf-8"],
 "/analytics/":["dashboard.html","text/html; charset=utf-8"],
 "/analytics.js":["dashboard.js","text/javascript; charset=utf-8"],
 "/analytics-view.js":["dashboard-view.js","text/javascript; charset=utf-8"],
 "/analytics.css":["dashboard.css","text/css; charset=utf-8"],
};
export async function serveAnalytics(req,res) {
 const path=new URL(req.url,"http://localhost").pathname;
 if(path==="/api/analytics-update")return analyticsUpdate(req,res);
 if(path==="/api/builder-users")return builderUsers(req,res);
 const asset=assets[path];
 if(!asset){res.statusCode=404;res.end("Not found");return;}
 if(!["GET","HEAD"].includes(req.method)){res.statusCode=405;res.setHeader("Allow","GET, HEAD");res.end("Method not allowed");return;}
 const bytes=await readFile(new URL(asset[0],import.meta.url));
 res.setHeader("Content-Type",asset[1]);res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
 res.statusCode=200;res.end(req.method==="HEAD"?undefined:bytes);
}
