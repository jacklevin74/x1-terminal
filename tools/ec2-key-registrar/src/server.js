import { appendFileSync } from "node:fs";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { kmsAdapter } from "./kms.js";
import { provisionerClient } from "./provisioner.js";
import { createProxyVerifier, loadProxyKeys } from "./proxy-auth.js";
import { createService } from "./service.js";

process.umask(0o077);
const env = process.env;
// Legacy trading-account keys: lifecycle only (disable, delete, cancel-delete). Nothing here can create a key.
const kms = kmsAdapter({ lifecycleRoleArn: env.X1_LIFECYCLE_ROLE_ARN });
await kms.verifyIdentity();
// New keys: the signer-account key provisioner. Without both settings the page shows creation as unavailable.
let provisioner = null;
if (env.X1_PROVISIONER_ARN || env.X1_SIGNER_CLIENT_ROLE_ARN) {
	provisioner = provisionerClient({ roleArn: env.X1_SIGNER_CLIENT_ROLE_ARN, functionArn: env.X1_PROVISIONER_ARN });
	await provisioner.verifyIdentity(); // STS only: confirms the assumed x1-signer-key-client role, invokes nothing.
}
const auditFile = env.X1_AUDIT_LOG ?? "/var/lib/x1-ec2-keys/audit.jsonl";
// Append-only JSONL: timestamp, owner, op, record id, agent address, result. Never ARNs, credentials or signatures.
const audit = (entry) =>
	appendFileSync(
		auditFile,
		JSON.stringify({
			ts: entry.ts,
			owner: entry.owner,
			op: entry.op,
			id: entry.id,
			agent: entry.agent ?? null,
			result: entry.result,
		}) + "\n",
		{ flag: "a", mode: 0o600 },
	);
const service = createService({ file: env.X1_KEYS_DB ?? "/var/lib/x1-ec2-keys/keys.sqlite", kms, provisioner, audit });
const verify = createProxyVerifier({ keys: loadProxyKeys() });
const extraOrigins = (env.X1_EXTRA_ORIGINS ?? "")
	.split(",")
	.map((v) => v.trim())
	.filter((v) => /^https:\/\/[a-z0-9.-]+$/.test(v));
const server = createServer(
	createApp({
		service,
		verify,
		production: env.NODE_ENV === "production",
		extraOrigins,
		allowPreviewMutations: env.X1_PREVIEW_MUTATIONS === "1",
		trustedHops: Math.min(Math.max(Number.parseInt(env.X1_TRUSTED_HOPS ?? "0", 10) || 0, 0), 3),
	}),
);
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(Number(env.X1_PORT ?? 8790), "127.0.0.1", () =>
	console.log(
		`EC2 key service ready on loopback; new keys: ${provisioner ? "signer account" : "unavailable"}; legacy keys: lifecycle only; no signing or exchange routes.`,
	),
);
process.on("SIGTERM", () =>
	server.close(() => {
		service.close();
		process.exit(0);
	}),
);
