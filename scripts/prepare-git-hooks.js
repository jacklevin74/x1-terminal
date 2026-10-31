import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Git hooks belong in local checkouts, not CI or Vercel function installs.
const isCI = process.env.CI && process.env.CI !== "false" && process.env.CI !== "0";
if (process.env.VERCEL === "1" || isCI || !existsSync(".git")) {
 console.log("Skipping Git hooks outside a local Git checkout.");
} else {
 const result = spawnSync("lefthook", ["install"], { stdio: "inherit", shell: process.platform === "win32" });
 if (result.error) console.error(result.error.message);
 process.exitCode = result.status ?? 1;
}
