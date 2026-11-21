import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { ethers } from "ethers";
import { KmsDenied, KmsState } from "./kms.js";
import { ProvisionerUnavailable } from "./provisioner.js";
import { createRateLimiter } from "./rate-limit.js";

/** Legacy keys (trading account): management only. */
export const DOMAIN = { name: "X1Ec2KeyCreation", version: "1" };
/** Signer-account keys. Must equal hl-ws signer/src/terminal-wallets.js DOMAIN: the provisioner verifies it again. */
export const SIGNER_DOMAIN = { name: "X1SignerKeys", version: "1" };
export const TYPES = {
	Request: [
		{ name: "action", type: "string" },
		{ name: "target", type: "address" },
		{ name: "nonce", type: "string" },
		{ name: "timestamp", type: "uint64" },
		{ name: "bodyHash", type: "bytes32" },
	],
};
export const MANAGEMENT_OPS = ["rename", "disable", "enable", "delete", "cancel-delete"];
export const APPROVAL_DAYS = [30, 90, 180];
const DAY = 86400000,
	RENEW_WINDOW = 14 * DAY,
	PENDING_CHECK_MS = 20000,
	ACTIVE_CHECK_MS = 600000,
	RECONCILE_MS = 60000;
export class RequestError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}
const fail = (status, message) => {
	throw new RequestError(status, message);
};
const address = (value) => {
	if (!ethers.isAddress(value)) fail(400, "A valid connected owner address is required.");
	return ethers.getAddress(value).toLowerCase();
};
const validName = (name) => typeof name === "string" && /^[-\w ]{1,16}$/.test(name) && name === name.trim();
const validId = (id) => typeof id === "string" && /^[a-f0-9-]{36}$/.test(id);
const safeReason = (reason) =>
	String(reason ?? "")
		.replace(/arn:\S+/g, "")
		.slice(0, 120);
const refusalStatus = (reason) =>
	/quota|limit/.test(reason) ? 429 : /signer is not|signature|authorization|own/.test(reason) ? 403 : 409;

function migrate(db) {
	db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS nonces(nonce TEXT PRIMARY KEY,owner TEXT NOT NULL,created INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,idem TEXT NOT NULL UNIQUE,owner TEXT NOT NULL,name TEXT NOT NULL,days INTEGER NOT NULL,state TEXT NOT NULL,arn TEXT,agent TEXT,created INTEGER NOT NULL,aws_request TEXT);
 CREATE INDEX IF NOT EXISTS requests_owner ON requests(owner);`);
	const columns = new Set(
		db
			.prepare("PRAGMA table_info(requests)")
			.all()
			.map((c) => c.name),
	);
	for (const [name, type] of [
		["nonce", "TEXT"],
		["kms_state", "TEXT NOT NULL DEFAULT 'enabled'"],
		["deletion_date", "INTEGER"],
		["updated", "INTEGER"],
		// signer-account keys; every row created before this column existed is a legacy trading-account key
		["backend", "TEXT NOT NULL DEFAULT 'legacy'"],
		["account", "TEXT"],
		["binding_status", "TEXT"],
		["valid_until", "INTEGER"],
		["checked", "INTEGER"],
		["check_reason", "TEXT"],
		["auth_raw", "TEXT"],
		["auth_header", "TEXT"],
	])
		if (!columns.has(name)) db.exec(`ALTER TABLE requests ADD COLUMN ${name} ${type}`);
}

/**
 * Owner-authorized key service for /api_keys.
 * New keys are created in the SIGNER account by the key provisioner Lambda (provisioner.js), which verifies the
 * owner's EIP-712 signature itself; this service relays the exact signed request and mirrors the result for the page.
 * Legacy keys (created in this trading account earlier) can only be disabled, deleted or have deletion cancelled.
 * The service never signs, approves or registers.
 */
export function createService({
	file,
	kms,
	provisioner = null,
	now = Date.now,
	maxOwner = 3,
	maxTotal = 30,
	audit = () => {},
	createLimit = createRateLimiter({ limit: 5, windowMs: 3600_000, now }),
	manageLimit = createRateLimiter({ limit: 30, windowMs: 3600_000, now }),
}) {
	const db = new DatabaseSync(file);
	migrate(db);
	const inflight = new Set();
	const publicState = (r) => {
		if (r.kms_state === "disabled") return "disabled";
		if (r.kms_state === "pending_deletion") return "pending_deletion";
		if (r.backend === "signer" && r.binding_status === "disabled") return "disabled";
		if (r.backend === "signer" && (r.binding_status === "active" || r.binding_status === "closing")) return "approved";
		return "awaiting_approval";
	};
	const rowPublic = (r) => {
		const signer = r.backend === "signer";
		return {
			id: r.id,
			name: r.name,
			agent: r.agent,
			createdAt: r.created,
			validUntil: signer && r.valid_until ? r.valid_until : r.created + r.days * DAY,
			state: publicState(r),
			backend: signer ? "signer" : "legacy",
			days: r.days,
			...(signer ? { account: r.account, signerStatus: r.binding_status ?? "pending" } : {}),
			...(signer && r.binding_status === "pending" && r.check_reason ? { activation: r.check_reason } : {}),
			...(r.kms_state === "pending_deletion" && r.deletion_date ? { deletionDate: r.deletion_date } : {}),
		};
	};
	const liveSigner = (rows) =>
		rows.filter(
			(r) =>
				r.backend === "signer" &&
				r.state !== "rejected" &&
				r.kms_state !== "pending_deletion" &&
				r.binding_status !== "disabled",
		);
	const record = (entry) => {
		try {
			audit({ ts: new Date(now()).toISOString(), ...entry });
		} catch {}
	};
	const ownerRows = (owner) => db.prepare("SELECT * FROM requests WHERE owner=? ORDER BY created ASC").all(owner);

	function snapshot(owner) {
		owner = address(owner);
		const rows = ownerRows(owner),
			total = liveSigner(db.prepare("SELECT backend,state,kms_state,binding_status FROM requests").all()).length;
		return {
			version: 1,
			supported: true,
			region: "us-east-2",
			owner,
			keyStore: provisioner ? "signer" : "unavailable",
			canCreate:
				!!provisioner &&
				liveSigner(rows).length < maxOwner &&
				total < maxTotal &&
				!rows.some((r) => r.backend === "signer" && ["uncertain", "creating_inflight"].includes(r.state)),
			pending: rows.filter((r) => !r.agent && r.state !== "rejected").length,
			capabilities: { create: !!provisioner, manage: true, sign: false, register: false },
			agents: rows.filter((r) => r.state === "ready" && r.agent).map(rowPublic),
		};
	}

	/** Moves pending signer keys to active once Hyperliquid shows the approval (the provisioner checks it itself). */
	async function refresh(owner) {
		if (!provisioner) return;
		const t = now();
		const due = ownerRows(owner).filter((r) => {
			if (r.backend !== "signer") return false;
			if (r.state === "uncertain") return t - (r.checked ?? 0) > RECONCILE_MS;
			if (r.state !== "ready" || r.kms_state !== "enabled") return false;
			if (r.binding_status === "pending") return t - (r.checked ?? 0) > PENDING_CHECK_MS;
			return (
				r.binding_status === "active" &&
				(r.valid_until ?? 0) - t < RENEW_WINDOW &&
				t - (r.checked ?? 0) > ACTIVE_CHECK_MS
			);
		});
		await Promise.allSettled(
			due.slice(0, 3).map(async (r) => {
				db.prepare("UPDATE requests SET checked=? WHERE id=?").run(t, r.id);
				if (r.state === "uncertain") return finishCreate(r).catch(() => {});
				const out = await provisioner.invoke({ op: "activate", account: r.account });
				if (out.ok)
					db.prepare("UPDATE requests SET binding_status=?,valid_until=?,check_reason=NULL,updated=? WHERE id=?").run(
						out.status,
						Number(out.validUntil) || r.valid_until,
						now(),
						r.id,
					);
				else db.prepare("UPDATE requests SET check_reason=? WHERE id=?").run(safeReason(out.reason), r.id);
			}),
		);
	}
	async function status(owner) {
		owner = address(owner);
		await refresh(owner);
		return snapshot(owner);
	}
	function nonce(owner) {
		owner = address(owner);
		const cutoff = now() - 300000;
		db.prepare("DELETE FROM nonces WHERE created<?").run(cutoff);
		if (db.prepare("SELECT count(*) AS n FROM nonces").get().n > 5000) fail(429, "Too many pending requests.");
		const nonce = randomBytes(16).toString("hex");
		db.prepare("INSERT INTO nonces(nonce,owner,created) VALUES(?,?,?)").run(nonce, owner, now());
		return { nonce, domain: DOMAIN, signerDomain: SIGNER_DOMAIN, types: TYPES };
	}

	/** Parses and verifies the owner's signed envelope. Does not consume the nonce. */
	function authorize(domain, action, owner, raw, header, keys, check) {
		let body, auth;
		try {
			body = JSON.parse(raw);
			auth = JSON.parse(header ?? "");
		} catch {
			fail(400, "Invalid request.");
		}
		if (
			!body ||
			typeof body !== "object" ||
			Array.isArray(body) ||
			!keys.includes(Object.keys(body).sort().join(",")) ||
			!ethers.isAddress(body.owner) ||
			address(body.owner) !== owner ||
			!check(body)
		)
			return { body: null };
		if (
			!auth ||
			typeof auth !== "object" ||
			!Number.isSafeInteger(auth.timestamp) ||
			Math.abs(now() - auth.timestamp) > 120000 ||
			typeof auth.nonce !== "string" ||
			!/^[a-f0-9]{32}$/.test(auth.nonce) ||
			typeof auth.signature !== "string"
		)
			fail(401, "Expired or invalid owner authorization.");
		const bodyHash = ethers.keccak256(ethers.toUtf8Bytes(raw));
		let signer;
		try {
			signer = ethers
				.verifyTypedData(
					domain,
					TYPES,
					{ action, target: owner, nonce: auth.nonce, timestamp: BigInt(auth.timestamp), bodyHash },
					auth.signature,
				)
				.toLowerCase();
		} catch {
			fail(401, "Invalid owner signature.");
		}
		return { body, auth, signer };
	}
	const consumeNonce = (nonce, owner) =>
		!!db
			.prepare("UPDATE nonces SET used=1 WHERE nonce=? AND owner=? AND used=0 AND created>? RETURNING nonce")
			.get(nonce, owner, now() - 300000);
	const quotaCheck = (owner) => {
		if (!snapshot(owner).canCreate) fail(429, "Key creation quota reached.");
		if (!createLimit(owner)) fail(429, "Too many key creation requests. Try again later.");
	};

	async function create(owner, raw, header) {
		owner = address(owner);
		if (!provisioner) fail(503, "Signer-account key creation is not configured yet.");
		const { body, auth, signer } = authorize(
			SIGNER_DOMAIN,
			"create",
			owner,
			raw,
			header,
			["account,days,name,owner"],
			(b) => validName(b.name) && APPROVAL_DAYS.includes(b.days) && ethers.isAddress(b.account),
		);
		if (!body)
			fail(
				400,
				"Choose the account, a name (1–16 letters, numbers, spaces, _ or -) and an approval of 30, 90 or 180 days.",
			);
		if (signer !== owner) fail(403, "Only the connected owner can create this key.");
		const account = address(body.account);
		const idem = createHash("sha256")
			.update(owner + "\n" + raw)
			.digest("hex");
		let row;
		db.exec("BEGIN IMMEDIATE");
		try {
			row = db.prepare("SELECT * FROM requests WHERE idem=?").get(idem);
			// The same (owner, nonce, body) is an idempotent retry and returns the original record.
			const retry = row && row.nonce === auth.nonce;
			if (!retry && !consumeNonce(auth.nonce, owner)) fail(401, "Nonce expired or already used.");
			if (row?.state === "rejected" && !retry) {
				// The signer account refused the earlier attempt before creating a key: this new signed request may try again.
				quotaCheck(owner);
				db.prepare("UPDATE requests SET state='creating',nonce=?,auth_raw=?,auth_header=?,updated=? WHERE id=?").run(
					auth.nonce,
					raw,
					header,
					now(),
					row.id,
				);
				row = db.prepare("SELECT * FROM requests WHERE id=?").get(row.id);
			}
			if (!row) {
				quotaCheck(owner);
				const id = randomUUID();
				db.prepare(
					"INSERT INTO requests(id,idem,owner,name,days,state,created,nonce,updated,backend,account,binding_status,auth_raw,auth_header) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
				).run(
					id,
					idem,
					owner,
					body.name,
					body.days,
					"creating",
					now(),
					auth.nonce,
					now(),
					"signer",
					account,
					"pending",
					raw,
					header,
				);
				row = db.prepare("SELECT * FROM requests WHERE id=?").get(id);
			}
			db.exec("COMMIT");
		} catch (error) {
			db.exec("ROLLBACK");
			throw error;
		}
		if (row.agent) return { ...snapshot(owner), createdAgentId: row.id };
		return finishCreate(row);
	}

	/**
	 * Sends the stored owner-signed request to the provisioner. Safe to repeat: the provisioner returns the key it
	 * already made for the same signed request (same nonce), and adopts a key whose alias exists without a binding.
	 */
	async function finishCreate(row) {
		const claim = db
			.prepare(
				"UPDATE requests SET state='creating_inflight' WHERE id=? AND state IN ('creating','uncertain') RETURNING id",
			)
			.get(row.id);
		if (!claim) fail(409, "Creation is in progress. Refresh in a moment; do not create a replacement.");
		const uncertain = () => {
			db.prepare("UPDATE requests SET state='uncertain',updated=? WHERE id=?").run(now(), row.id);
			record({ owner: row.owner, op: "create", id: row.id, agent: null, result: "uncertain" });
			fail(
				503,
				"Key creation in the signer account was not confirmed. Refresh: the same request is finished without creating a second key.",
			);
		};
		let out;
		try {
			out = await provisioner.invoke({
				op: "key-create",
				account: row.account,
				owner: row.owner,
				auth: { raw: row.auth_raw, header: row.auth_header },
			});
		} catch (error) {
			if (error instanceof ProvisionerUnavailable) uncertain();
			throw error;
		}
		if (!out.ok && out.reason === "provisioner error") uncertain();
		if (!out.ok) {
			const reason = safeReason(out.reason);
			db.prepare("UPDATE requests SET state='rejected',auth_raw=NULL,auth_header=NULL,updated=? WHERE id=?").run(
				now(),
				row.id,
			);
			record({
				owner: row.owner,
				op: "create",
				id: row.id,
				agent: null,
				result: `signer_refused:${reason.slice(0, 40)}`,
			});
			fail(refusalStatus(reason), `The signer account refused key creation: ${reason}. No key was created.`);
		}
		const b = out.binding;
		if (
			!b ||
			!ethers.isAddress(b.agent) ||
			b.account?.toLowerCase() !== row.account ||
			b.owner?.toLowerCase() !== row.owner ||
			b.source !== "terminal"
		)
			uncertain();
		const agent = ethers.getAddress(b.agent);
		db.prepare(
			"UPDATE requests SET agent=?,binding_status=?,kms_state='enabled',state='ready',auth_raw=NULL,auth_header=NULL,updated=? WHERE id=?",
		).run(agent, b.status ?? "pending", now(), row.id);
		record({ owner: row.owner, op: "create", id: row.id, agent, result: "ok" });
		return { ...snapshot(row.owner), createdAgentId: row.id };
	}

	async function manage(op, owner, raw, header) {
		if (!MANAGEMENT_OPS.includes(op)) fail(405, "Operation is not supported.");
		owner = address(owner);
		let parsed;
		try {
			parsed = JSON.parse(raw);
		} catch {
			fail(400, "Invalid request.");
		}
		const signerKey = !!parsed && typeof parsed === "object" && Object.hasOwn(parsed, "account");
		return signerKey ? manageSigner(op, owner, raw, header) : manageLegacy(op, owner, raw, header);
	}

	async function guarded(row, op, owner, nonceValue, work) {
		if (!consumeNonce(nonceValue, owner)) fail(401, "Nonce expired or already used.");
		if (!manageLimit(owner)) fail(429, "Too many key changes. Try again later.");
		if (inflight.has(row.id)) fail(409, "Another change to this key is in progress.");
		inflight.add(row.id);
		const done = (result) => record({ owner, op, id: row.id, agent: row.agent, result });
		try {
			await work();
			done("ok");
			return { ...snapshot(owner), updatedAgentId: row.id };
		} catch (error) {
			if (error instanceof RequestError) {
				done(`rejected:${error.status}`);
				throw error;
			}
			if (error instanceof KmsDenied) {
				done("aws_denied");
				fail(403, "AWS refused this key operation.");
			}
			if (error instanceof KmsState) {
				done("aws_state");
				fail(409, "The key is not in a state that allows this change. Refresh and retry.");
			}
			done("unconfirmed");
			fail(502, "The change was not confirmed. Refresh before retrying.");
		} finally {
			inflight.delete(row.id);
		}
	}

	async function manageSigner(op, owner, raw, header) {
		const keys =
			op === "rename"
				? ["account,agent,name,owner"]
				: op === "delete"
					? ["account,agent,owner", "account,agent,days,owner"]
					: ["account,agent,owner"];
		const { body, auth, signer } = authorize(
			SIGNER_DOMAIN,
			op,
			owner,
			raw,
			header,
			keys,
			(b) =>
				ethers.isAddress(b.account) &&
				ethers.isAddress(b.agent) &&
				(op !== "rename" || validName(b.name)) &&
				(b.days === undefined || (Number.isInteger(b.days) && b.days >= 7 && b.days <= 30)),
		);
		if (!body) fail(400, op === "delete" ? "Choose a deletion window of 7 to 30 days." : "Invalid key request.");
		if (signer !== owner) fail(403, "Only the key owner can change this key.");
		const row = db
			.prepare(
				"SELECT * FROM requests WHERE backend='signer' AND state='ready' AND owner=? AND account=? AND lower(agent)=?",
			)
			.get(owner, body.account.toLowerCase(), body.agent.toLowerCase());
		if (!row) fail(404, "Key not found.");
		return guarded(row, op, owner, auth.nonce, async () => {
			if (op === "rename") {
				db.prepare("UPDATE requests SET name=?,updated=? WHERE id=?").run(body.name, now(), row.id);
				return;
			}
			if (!provisioner) fail(503, "The signer account is not reachable from this service.");
			let out;
			try {
				out = await provisioner.invoke({ op: "key-manage", account: row.account, action: op, auth: { raw, header } });
			} catch (error) {
				if (error instanceof ProvisionerUnavailable)
					fail(502, "The signer account did not confirm the change. Refresh before retrying.");
				throw error;
			}
			if (!out.ok) {
				const reason = safeReason(out.reason);
				fail(refusalStatus(reason), `The signer account refused: ${reason}.`);
			}
			const b = out.binding ?? {};
			db.prepare(
				"UPDATE requests SET binding_status=?,kms_state=?,deletion_date=?,check_reason=NULL,updated=? WHERE id=?",
			).run(b.status ?? row.binding_status, b.keyState ?? row.kms_state, b.deletionDate ?? null, now(), row.id);
		});
	}

	async function manageLegacy(op, owner, raw, header) {
		const keys = op === "rename" ? ["id,name,owner"] : op === "delete" ? ["id,owner", "days,id,owner"] : ["id,owner"];
		const { body, auth, signer } = authorize(
			DOMAIN,
			op,
			owner,
			raw,
			header,
			keys,
			(b) =>
				validId(b.id) &&
				(op !== "rename" || validName(b.name)) &&
				(b.days === undefined || (Number.isInteger(b.days) && b.days >= 7 && b.days <= 30)),
		);
		if (!body)
			fail(
				400,
				op === "rename"
					? "Choose a name of 1–16 letters, numbers, spaces, _ or -."
					: op === "delete"
						? "Choose a deletion window of 7 to 30 days."
						: "Invalid key request.",
			);
		if (signer !== owner) fail(403, "Only the key owner can change this key.");
		const row = db.prepare("SELECT * FROM requests WHERE id=? AND state='ready' AND backend='legacy'").get(body.id);
		if (!row) fail(404, "Key not found.");
		if (row.owner !== owner) fail(403, "Only the key owner can change this key.");
		if (op === "enable")
			fail(409, "Legacy keys cannot be re-enabled: the X1 signer can never use them. Create a new key instead.");
		return guarded(row, op, owner, auth.nonce, async () => {
			const state = row.kms_state;
			if (op === "rename") {
				db.prepare("UPDATE requests SET name=?,updated=? WHERE id=?").run(body.name, now(), row.id);
			} else if (op === "disable") {
				if (state !== "enabled") fail(409, "Only an enabled key can be disabled.");
				await kms.disable(row.arn);
				db.prepare("UPDATE requests SET kms_state='disabled',updated=? WHERE id=?").run(now(), row.id);
			} else if (op === "delete") {
				if (state === "pending_deletion") fail(409, "Deletion is already scheduled.");
				const days = body.days ?? 30,
					out = await kms.scheduleDeletion(row.arn, days);
				db.prepare("UPDATE requests SET kms_state='pending_deletion',deletion_date=?,updated=? WHERE id=?").run(
					out?.deletionDate ?? now() + days * DAY,
					now(),
					row.id,
				);
			} else {
				if (state !== "pending_deletion") fail(409, "Deletion is not scheduled for this key.");
				await kms.cancelDeletion(row.arn);
				// KMS leaves a key Disabled after CancelKeyDeletion.
				db.prepare("UPDATE requests SET kms_state='disabled',deletion_date=NULL,updated=? WHERE id=?").run(
					now(),
					row.id,
				);
			}
		});
	}
	return { status, snapshot, nonce, create, manage, close: () => db.close() };
}
