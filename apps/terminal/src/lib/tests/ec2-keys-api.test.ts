import { keccak256, toBytes } from "viem";
import { expect, it, vi } from "vitest";
import {
	createEc2Key,
	EC2_KEYS_DOMAIN,
	EC2_KEYS_TYPES,
	ec2AgentName,
	getEc2Keys,
	manageEc2Key,
	parseEc2Keys,
	renewDue,
	SIGNER_KEYS_DOMAIN,
	signerKeyLabel,
} from "@/lib/ec2-keys/api";

const owner = `0x${"ab".repeat(20)}` as const,
	agent = `0x${"cd".repeat(20)}` as const,
	sub = `0x${"ef".repeat(20)}` as const;
const signerKey = {
	id: "key-id",
	name: "X1 Key",
	agent,
	state: "awaiting_approval",
	createdAt: 1,
	validUntil: 9999999999999,
	backend: "signer",
	days: 90,
	account: owner,
	signerStatus: "pending",
} as const;
const legacyKey = {
	id: "legacy-id",
	name: "Old",
	agent: `0x${"12".repeat(20)}`,
	state: "awaiting_approval",
	createdAt: 1,
	validUntil: 9999999999999,
	backend: "legacy",
	days: 7,
} as const;
const status = {
	version: 1,
	supported: true,
	region: "us-east-2",
	owner,
	keyStore: "signer",
	canCreate: true,
	pending: 0,
	capabilities: { create: true, manage: true, sign: false, register: false },
	agents: [signerKey],
	createdAgentId: "key-id",
};
const nonceReply = {
	nonce: "b".repeat(32),
	domain: EC2_KEYS_DOMAIN,
	signerDomain: SIGNER_KEYS_DOMAIN,
	types: EC2_KEYS_TYPES,
};
const updated = (agents: unknown[], id = "key-id") => ({
	...status,
	createdAgentId: undefined,
	updatedAgentId: id,
	agents,
});
const replying = (post: unknown, code = 200) =>
	vi.fn(
		async (_u, init) =>
			new Response(JSON.stringify(init?.method === "POST" ? post : nonceReply), {
				status: init?.method === "POST" ? code : 200,
			}),
	) as unknown as typeof fetch;

it("checks owner, capabilities and key records, and strips server-only metadata", () => {
	expect(() => parseEc2Keys({ ...status, owner: agent }, owner)).toThrow("owner");
	expect(() =>
		parseEc2Keys({ ...status, capabilities: { create: true, manage: true, sign: true, register: false } }, owner),
	).toThrow("capabilities");
	expect(() => parseEc2Keys({ ...status, keyStore: "trading" }, owner)).toThrow("capabilities");
	const result = parseEc2Keys(
		{ ...status, awsSecret: "test-only", agents: [{ ...signerKey, kmsKeyId: "server-only" }, legacyKey] },
		owner,
	);
	expect(result).not.toHaveProperty("awsSecret");
	expect(result.agents[0]).not.toHaveProperty("kmsKeyId");
	expect(result.agents.map((k) => k.backend)).toEqual(["signer", "legacy"]);
	expect(() => parseEc2Keys({ ...status, agents: [{ ...signerKey, account: "nope" }] }, owner)).toThrow("invalid key");
	expect(() => parseEc2Keys({ ...status, agents: [{ ...signerKey, signerStatus: "signing" }] }, owner)).toThrow(
		"invalid key",
	);
	expect(() => parseEc2Keys({ ...status, agents: [{ ...legacyKey, account: owner }] }, owner)).toThrow("invalid key");
	expect(parseEc2Keys({ ...status, keyStore: "unavailable", canCreate: true }, owner).canCreate).toBe(false);
});
it("signs the exact creation body, bound to the chosen account, with the signer-account domain; never retries a POST", async () => {
	const calls: { url: string; init?: RequestInit }[] = [],
		sign = vi.fn().mockResolvedValue(`0x${"11".repeat(65)}`),
		assertOwner = vi.fn();
	const fetcher = vi.fn(async (url, init) => {
		calls.push({ url: String(url), init });
		return new Response(JSON.stringify(calls.length === 1 ? nonceReply : status));
	}) as typeof fetch;
	const result = await createEc2Key({ owner, account: sub, name: "X1 Key", days: 90, sign, assertOwner, fetcher });
	expect(result.agents[0].agent).toBe(agent);
	const raw = calls[1].init!.body as string;
	expect(sign.mock.calls[0][0].domain).toEqual(SIGNER_KEYS_DOMAIN);
	expect(sign.mock.calls[0][0].message).toMatchObject({
		action: "create",
		target: owner,
		bodyHash: keccak256(toBytes(raw)),
	});
	expect(raw).toBe(JSON.stringify({ account: sub, days: 90, name: "X1 Key", owner }));
	const failed = replying({ error: "Key creation in the signer account was not confirmed" }, 503);
	await expect(
		createEc2Key({ owner, account: owner, name: "X1 Key", days: 90, sign, assertOwner, fetcher: failed }),
	).rejects.toThrow("not confirmed");
	expect(failed).toHaveBeenCalledTimes(2);
	const unused = vi.fn() as unknown as typeof fetch;
	await expect(
		createEc2Key({ owner, account: owner, name: "X1 Key", days: 7, sign, assertOwner, fetcher: unused }),
	).rejects.toThrow("supported approval");
	expect(unused).not.toHaveBeenCalled();
});
it("refuses a nonce reply without the expected signer domain before requesting a signature", async () => {
	const sign = vi.fn(),
		fetcher = vi.fn(
			async () =>
				new Response(JSON.stringify({ nonce: "a".repeat(32), domain: EC2_KEYS_DOMAIN, types: EC2_KEYS_TYPES })),
		) as typeof fetch;
	await expect(
		createEc2Key({ owner, account: owner, name: "X1 Key", days: 90, sign, assertOwner: () => {}, fetcher }),
	).rejects.toThrow("authorization configuration");
	expect(sign).not.toHaveBeenCalled();
});
it("signer-key management signs {account, agent, owner} with the signer domain", async () => {
	const sign = vi.fn().mockResolvedValue(`0x${"11".repeat(65)}`);
	const fetcher = replying(updated([{ ...signerKey, state: "disabled", signerStatus: "disabled" }]));
	const result = await manageEc2Key({ op: "disable", owner, key: signerKey, sign, assertOwner: () => {}, fetcher });
	expect(result.agents[0].state).toBe("disabled");
	const raw = (fetcher as any).mock.calls[1][1].body;
	expect(JSON.parse(raw)).toEqual({ account: owner, agent, owner });
	expect(sign.mock.calls[0][0].domain).toEqual(SIGNER_KEYS_DOMAIN);
	expect(sign.mock.calls[0][0].message).toMatchObject({
		action: "disable",
		target: owner,
		bodyHash: keccak256(toBytes(raw)),
	});
	const renamed = replying(updated([{ ...signerKey, name: "New" }]));
	await manageEc2Key({
		op: "rename",
		owner,
		key: signerKey,
		name: "New",
		sign,
		assertOwner: () => {},
		fetcher: renamed,
	});
	expect(JSON.parse((renamed as any).mock.calls[1][1].body)).toEqual({ account: owner, agent, name: "New", owner });
});
it("legacy keys keep the old domain and id body, and are never re-enabled", async () => {
	const sign = vi.fn().mockResolvedValue(`0x${"11".repeat(65)}`);
	const fetcher = replying(updated([{ ...legacyKey, state: "disabled" }], "legacy-id"));
	await manageEc2Key({ op: "disable", owner, key: legacyKey, sign, assertOwner: () => {}, fetcher });
	expect(JSON.parse((fetcher as any).mock.calls[1][1].body)).toEqual({ id: "legacy-id", owner });
	expect(sign.mock.calls[0][0].domain).toEqual(EC2_KEYS_DOMAIN);
	const unused = vi.fn() as unknown as typeof fetch;
	await expect(
		manageEc2Key({ op: "enable", owner, key: legacyKey, sign, assertOwner: () => {}, fetcher: unused }),
	).rejects.toThrow("cannot be re-enabled");
	expect(unused).not.toHaveBeenCalled();
});
it("refuses unconfirmed management results and invalid inputs without retrying", async () => {
	const sign = vi.fn().mockResolvedValue(`0x${"11".repeat(65)}`);
	const stale = replying(updated([signerKey]));
	await expect(
		manageEc2Key({ op: "disable", owner, key: signerKey, sign, assertOwner: () => {}, fetcher: stale }),
	).rejects.toThrow("not confirmed");
	expect(stale).toHaveBeenCalledTimes(2);
	const denied = replying({ error: "The signer account refused: signer is not the key owner." }, 403);
	await expect(
		manageEc2Key({ op: "delete", owner, key: signerKey, sign, assertOwner: () => {}, fetcher: denied }),
	).rejects.toThrow("signer is not the key owner");
	const unused = vi.fn() as unknown as typeof fetch;
	await expect(
		manageEc2Key({ op: "rename", owner, key: signerKey, name: " bad!", sign, assertOwner: () => {}, fetcher: unused }),
	).rejects.toThrow("Choose a name");
	await expect(
		manageEc2Key({ op: "delete", owner, key: signerKey, days: 3, sign, assertOwner: () => {}, fetcher: unused }),
	).rejects.toThrow("7 to 30");
	expect(unused).not.toHaveBeenCalled();
});
it("approval names: signer keys pick valid_until at approval time (capped at 180 days); renewal and labels", () => {
	const now = 1_800_000_000_000;
	expect(ec2AgentName({ ...signerKey, days: 90 }, now)).toBe(
		`X1S${agent.slice(2, 14)} valid_until ${now + 90 * 86400000}`,
	);
	expect(ec2AgentName({ ...signerKey, days: 400 }, now)).toBe(
		`X1S${agent.slice(2, 14)} valid_until ${now + 180 * 86400000}`,
	);
	const active = { ...signerKey, state: "approved", signerStatus: "active", validUntil: now + 10 * 86400000 } as const;
	expect(renewDue(active, now)).toBe(true);
	expect(signerKeyLabel(active, true, now)).toBe("Active · renew soon");
	expect(signerKeyLabel({ ...active, validUntil: now + 60 * 86400000 }, true, now)).toBe(
		"Active · X1 signer can trade",
	);
	expect(signerKeyLabel({ ...signerKey, activation: "builder fee not approved (need 0.05%)" }, true, now)).toMatch(
		/builder fee/,
	);
	expect(signerKeyLabel(signerKey, false, now)).toBe("Awaiting Hyperliquid approval");
	expect(signerKeyLabel(legacyKey, false, now)).toMatch(/not usable for trading/);
});
it("reports the key service as unavailable without leaking AWS identifiers", async () => {
	const down = vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 })) as typeof fetch;
	await expect(getEc2Keys(owner, undefined, down)).rejects.toThrow("EC2 key service unavailable.");
	const leaky = vi.fn(
		async () => new Response(JSON.stringify({ error: "arn:aws:kms:us-east-2:1:key/x denied" }), { status: 403 }),
	) as typeof fetch;
	await expect(getEc2Keys(owner, undefined, leaky)).rejects.toThrow("EC2 key service unavailable.");
});
