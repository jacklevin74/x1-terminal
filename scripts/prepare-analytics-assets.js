import { mkdir, copyFile } from "node:fs/promises";
const output=new URL("../apps/terminal/public/analytics/",import.meta.url);
await mkdir(output,{recursive:true});
for(const [source,target] of [["dashboard-view.js","dashboard-view.js"],["portfolio.js","analytics-portfolio.js"],["dashboard.html","index.html"],["dashboard.js","analytics.js"],["dashboard-view.js","analytics-view.js"],["dashboard.css","analytics.css"]])await copyFile(new URL(`../server/analytics/${source}`,import.meta.url),new URL(target,output));
console.log("Prepared /analytics static assets.");
