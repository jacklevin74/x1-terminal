import { type Address, type Hex, isAddress, keccak256, toBytes } from "viem";
export const EC2_KEYS_DOMAIN = { name: "X1Ec2KeyCreation", version: "1" } as const;
export const SIGNER_KEYS_DOMAIN = { name: "X1SignerKeys", version: "1" } as const;
export const EC2_KEYS_TYPES = {
	Request: [
		{ name: "action", type: "string" },
		{ name: "target", type: "address" },
		{ name: "nonce", type: "string" },
		{ name: "timestamp", type: "uint64" },
		{ name: "bodyHash", type: "bytes32" },
	],
} as const;
export const EC2_KEY_STATES = ["awaiting_approval", "approved", "disabled", "pending_deletion"] as const;
export const SIGNER_STATUSES = ["pending", "active", "closing", "disabled"] as const;
export const APPROVAL_DAYS = [30, 90, 180] as const;
export const DEFAULT_APPROVAL_DAYS = 90;
export const SIGNER_DEFAULT_LIMITS = {
	maxLeverage: 3,
	maxGrossLev: 3,
	maxOrderUsd: 1000,
	maxOrdersPerMin: 60,
} as const;
export const RENEW_WINDOW_MS = 14 * 86400000;
const MAX_APPROVAL_MS = 180 * 86400000;
export type Ec2KeyState = (typeof EC2_KEY_STATES)[number];
export type SignerStatus = (typeof SIGNER_STATUSES)[number];
export type KeyBackend = "signer" | "legacy";
export interface Ec2Key {
	id: string;
	agent: Address;
	name: string;
	createdAt: number;
	validUntil: number;
	state: Ec2KeyState;
	backend: KeyBackend;
	days: number;
	account?: Address;
	signerStatus?: SignerStatus;
	activation?: string;
	deletionDate?: number;
}
export interface Ec2KeysStatus {
	version: 1;
	supported: true;
	owner: Address;
	region: "us-east-2";
	keyStore: "signer" | "unavailable";
	canCreate: boolean;
	pending: number;
	capabilities: { create: boolean; manage: boolean; sign: false; register: false };
	agents: Ec2Key[];
	createdAgentId?: string;
	updatedAgentId?: string;
}
export type Ec2Action = "create" | Ec2ManageOp;
export type Ec2ManageOp = "rename" | "disable" | "enable" | "delete" | "cancel-delete";
type Domain = typeof EC2_KEYS_DOMAIN | typeof SIGNER_KEYS_DOMAIN;
export type Ec2CreationSignature = {
	account: Address;
	domain: Domain;
	types: typeof EC2_KEYS_TYPES;
	primaryType: "Request";
	message: { action: Ec2Action; target: Address; nonce: string; timestamp: bigint; bodyHash: Hex };
};
export const EC2_UNAVAILABLE = "EC2 key service unavailable.";
const NAME = /^[-\w ]{1,16}$/,
	ID = /^[-\w]{1,128}$/;
async function request(op: string, owner: Address, init: RequestInit = {}, fetcher = fetch) {
	const response = await fetcher(`/api/ec2-keys?${new URLSearchParams({ op, owner })}`, {
		...init,
		cache: "no-store",
		redirect: "error",
		signal: init.signal ?? AbortSignal.timeout(25000),
	});
	if (!response.ok) {
		let message = EC2_UNAVAILABLE;
		try {
			const value = await response.json();
			if (typeof value.error === "string" && value.error.length < 300 && !/arn:|AKIA|ASIA/.test(value.error))
				message = value.error;
		} catch {}
		throw Error(message);
	}
	return response.json();
}
function validKey(key: Ec2Key) {
	if (
		!key ||
		typeof key.id !== "string" ||
		!ID.test(key.id) ||
		!isAddress(key.agent) ||
		typeof key.name !== "string" ||
		!key.name.trim() ||
		key.name.length > 16 ||
		!EC2_KEY_STATES.includes(key.state) ||
		!Number.isFinite(key.createdAt) ||
		!Number.isFinite(key.validUntil) ||
		key.createdAt <= 0 ||
		key.validUntil <= key.createdAt ||
		!Number.isInteger(key.days) ||
		(key.state === "pending_deletion" && key.deletionDate !== undefined && !Number.isFinite(key.deletionDate))
	)
		return false;
	if (key.backend === "legacy") return key.account === undefined && key.signerStatus === undefined;
	return (
		key.backend === "signer" &&
		!!key.account &&
		isAddress(key.account) &&
		!!key.signerStatus &&
		SIGNER_STATUSES.includes(key.signerStatus) &&
		(key.activation === undefined || (typeof key.activation === "string" && key.activation.length <= 160))
	);
}
export function parseEc2Keys(value: unknown, owner: Address): Ec2KeysStatus {
	const data = value as Ec2KeysStatus;
	if (
		data?.version !== 1 ||
		data.supported !== true ||
		data.region !== "us-east-2" ||
		data.owner?.toLowerCase() !== owner.toLowerCase() ||
		(data.keyStore !== "signer" && data.keyStore !== "unavailable") ||
		typeof data.canCreate !== "boolean" ||
		!Number.isInteger(data.pending) ||
		data.pending < 0 ||
		typeof data.capabilities?.create !== "boolean" ||
		data.capabilities.sign !== false ||
		data.capabilities.register !== false ||
		!Array.isArray(data.agents)
	)
		throw Error("EC2 key service returned invalid owner or capabilities.");
	const ids = new Set(),
		addresses = new Set();
	for (const key of data.agents) {
		if (!validKey(key) || ids.has(key.id) || addresses.has(key.agent.toLowerCase()))
			throw Error("EC2 key service returned an invalid key record.");
		ids.add(key.id);
		addresses.add(key.agent.toLowerCase());
	}
	for (const field of ["createdAgentId", "updatedAgentId"] as const)
		if (data[field] !== undefined && (typeof data[field] !== "string" || !ids.has(data[field])))
			throw Error("EC2 key service returned an unknown key id.");
	return {
		version: 1,
		supported: true,
		owner: data.owner,
		region: "us-east-2",
		keyStore: data.keyStore,
		canCreate: data.canCreate && data.keyStore === "signer",
		pending: data.pending,
		capabilities: {
			create: data.capabilities.create,
			manage: data.capabilities.manage === true,
			sign: false,
			register: false,
		},
		agents: data.agents.map((key) => ({
			id: key.id,
			agent: key.agent,
			name: key.name,
			state: key.state,
			createdAt: key.createdAt,
			validUntil: key.validUntil,
			backend: key.backend,
			days: key.days,
			...(key.backend === "signer"
				? {
						account: key.account,
						signerStatus: key.signerStatus,
						...(key.activation ? { activation: key.activation } : {}),
					}
				: {}),
			...(key.state === "pending_deletion" && key.deletionDate !== undefined ? { deletionDate: key.deletionDate } : {}),
		})),
		...(data.createdAgentId ? { createdAgentId: data.createdAgentId } : {}),
		...(data.updatedAgentId ? { updatedAgentId: data.updatedAgentId } : {}),
	};
}
export async function getEc2Keys(owner: Address, signal?: AbortSignal, fetcher = fetch) {
	return parseEc2Keys(await request("status", owner, { signal }, fetcher), owner);
}
type Signer = {
	owner: Address;
	sign: (args: Ec2CreationSignature) => Promise<Hex>;
	assertOwner: () => void;
	fetcher?: typeof fetch;
};
/** Fetches a single-use nonce, has the owner sign the exact body, and posts it. Never retries a POST. */
async function signedPost(
	action: Ec2Action,
	raw: string,
	domain: Domain,
	{ owner, sign, assertOwner, fetcher = fetch }: Signer,
) {
	const nonce = await request("nonce", owner, {}, fetcher);
	assertOwner();
	if (
		typeof nonce.nonce !== "string" ||
		!/^[a-f0-9]{32}$/.test(nonce.nonce) ||
		JSON.stringify(nonce.domain) !== JSON.stringify(EC2_KEYS_DOMAIN) ||
		JSON.stringify(nonce.signerDomain) !== JSON.stringify(SIGNER_KEYS_DOMAIN) ||
		JSON.stringify(nonce.types) !== JSON.stringify(EC2_KEYS_TYPES)
	)
		throw Error("EC2 owner authorization configuration does not match this terminal.");
	const timestamp = Date.now(),
		signature = await sign({
			account: owner,
			domain,
			types: EC2_KEYS_TYPES,
			primaryType: "Request",
			message: {
				action,
				target: owner,
				nonce: nonce.nonce,
				timestamp: BigInt(timestamp),
				bodyHash: keccak256(toBytes(raw)),
			},
		});
	assertOwner();
	const result = parseEc2Keys(
		await request(
			action,
			owner,
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-auth": JSON.stringify({ nonce: nonce.nonce, timestamp, signature }),
				},
				body: raw,
			},
			fetcher,
		),
		owner,
	);
	assertOwner();
	return result;
}
/** Creates a key in the signer account, bound to `account` (the owner's main account or one of its sub-accounts). */
export async function createEc2Key({
	owner,
	account,
	name,
	days,
	...signer
}: Omit<Signer, "owner"> & { owner: Address; account: Address; name: string; days: number }) {
	signer.assertOwner();
	if (
		!isAddress(owner) ||
		!isAddress(account) ||
		!NAME.test(name) ||
		name !== name.trim() ||
		!(APPROVAL_DAYS as readonly number[]).includes(days)
	)
		throw Error("Choose an account, a key name and a supported approval duration.");
	const raw = JSON.stringify({ account: account.toLowerCase(), days, name, owner: owner.toLowerCase() });
	const result = await signedPost("create", raw, SIGNER_KEYS_DOMAIN, { owner, ...signer });
	if (!result.agents.some((k) => k.id === result.createdAgentId))
		throw Error("Key creation was not confirmed. Refresh before retrying.");
	return result;
}
function manageBody(op: Ec2ManageOp, owner: Address, key: ManagedKey, name?: string, days?: number) {
	const who = owner.toLowerCase();
	if (key.backend === "signer") {
		const base = { account: String(key.account).toLowerCase(), agent: key.agent.toLowerCase() };
		if (op === "rename") return { ...base, name, owner: who };
		if (op === "delete" && days !== undefined) return { ...base, days, owner: who };
		return { ...base, owner: who };
	}
	if (op === "rename") return { id: key.id, name, owner: who };
	if (op === "delete" && days !== undefined) return { days, id: key.id, owner: who };
	return { id: key.id, owner: who };
}
type ManagedKey = Pick<Ec2Key, "id" | "agent" | "backend" | "account">;
/**
 * Owner-signed key management. Signer-account keys are signed with the X1SignerKeys domain and verified again by the
 * signer account; legacy trading-account keys keep the X1Ec2KeyCreation domain and can only be renamed, disabled or
 * deleted.
 */
export async function manageEc2Key({
	op,
	owner,
	key,
	name,
	days,
	...signer
}: Omit<Signer, "owner"> & { op: Ec2ManageOp; owner: Address; key: ManagedKey; name?: string; days?: number }) {
	signer.assertOwner();
	if (!isAddress(owner) || !ID.test(key.id) || (key.backend === "signer" && !(key.account && isAddress(key.account))))
		throw Error("Select a key belonging to this owner.");
	if (key.backend === "legacy" && op === "enable")
		throw Error("Legacy keys cannot be re-enabled. Create a new key instead.");
	if (op === "rename" && (!name || !NAME.test(name) || name !== name.trim()))
		throw Error("Choose a name of 1–16 letters, numbers, spaces, _ or -.");
	if (op === "delete" && days !== undefined && (!Number.isInteger(days) || days < 7 || days > 30))
		throw Error("Choose a deletion window of 7 to 30 days.");
	const domain = key.backend === "signer" ? SIGNER_KEYS_DOMAIN : EC2_KEYS_DOMAIN;
	const result = await signedPost(op, JSON.stringify(manageBody(op, owner, key, name, days)), domain, {
		owner,
		...signer,
	});
	if (result.updatedAgentId !== key.id) throw Error("The key change was not confirmed. Refresh before retrying.");
	const updated = result.agents.find((k) => k.id === key.id);
	const expected: Partial<Record<Ec2ManageOp, Ec2KeyState>> = {
		disable: "disabled",
		delete: "pending_deletion",
		enable: "awaiting_approval",
		"cancel-delete": "disabled",
	};
	if (
		!updated ||
		(expected[op] && updated.state !== expected[op] && !(op === "enable" && updated.state === "approved")) ||
		(op === "rename" && updated.name !== name)
	)
		throw Error("The key change was not confirmed. Refresh before retrying.");
	return result;
}
/** Hyperliquid approval name for a key: `valid_until` is chosen at approval time (now + the key's duration). */
export function ec2AgentName(key: Pick<Ec2Key, "agent" | "validUntil" | "backend" | "days">, now = Date.now()) {
	if (key.backend === "legacy") return `X1K${key.agent.slice(2, 14).toLowerCase()} valid_until ${key.validUntil}`;
	const until = now + Math.min(key.days * 86400000, MAX_APPROVAL_MS);
	return `X1S${key.agent.slice(2, 14).toLowerCase()} valid_until ${until}`;
}
export function renewDue(key: Pick<Ec2Key, "signerStatus" | "validUntil">, now = Date.now()) {
	return key.signerStatus === "active" && key.validUntil - now < RENEW_WINDOW_MS;
}
export function signerKeyLabel(key: Ec2Key, approvedOnHyperliquid: boolean, now = Date.now()) {
	if (key.state === "pending_deletion")
		return `Deletion scheduled${key.deletionDate ? ` · ${new Date(key.deletionDate).toLocaleDateString()}` : ""}`;
	if (key.state === "disabled") return "Disabled";
	if (key.backend === "legacy") return "Legacy · trading account · not usable for trading";
	if (key.signerStatus === "active" && key.validUntil <= now) return "Approval expired · renew it";
	if (renewDue(key, now)) return "Active · renew soon";
	if (key.signerStatus === "active") return "Active · X1 signer can trade";
	if (key.signerStatus === "closing") return "Closing · reduce-only";
	if (!approvedOnHyperliquid) return "Awaiting Hyperliquid approval";
	if (key.activation && /builder fee/i.test(key.activation)) return "Approve the X1 builder fee to activate";
	return "Activating…";
}
export function signerKeyTone(key: Ec2Key, now = Date.now()) {
	if (key.state === "pending_deletion") return "text-error";
	if (key.state === "disabled" || key.backend === "legacy") return "text-fg-muted";
	if (key.signerStatus === "active" && !renewDue(key, now)) return "text-success";
	return "text-warning";
}
