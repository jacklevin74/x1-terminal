import { publishAnalytics } from "../server/analytics/publish.js";
try{const result=await publishAnalytics();console.log(`Published ${result.users} traders and ${result.fills} fills at ${result.publishedAt}. The leaderboard will refresh automatically.`);}
catch(error){console.error(error instanceof Error?error.message:"Publishing failed");process.exitCode=1;}
