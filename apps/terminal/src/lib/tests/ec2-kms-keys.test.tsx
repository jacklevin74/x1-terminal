// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	offline: false,
	keyStore: "signer",
	create: vi.fn(),
	manage: vi.fn(),
	approve: vi.fn(),
	sign: vi.fn(),
	approved: [] as any[],
	subs: [] as any[],
	rows: [] as any[],
}));
const owner = `0x${"ab".repeat(20)}` as const,
	agent = `0x${"cd".repeat(20)}` as const,
	sub = `0x${"ef".repeat(20)}` as const;
const key = {
	id: "kms-id",
	name: "X1 Key",
	agent,
	createdAt: Date.now(),
	validUntil: Date.now() + 90 * 86400000,
	state: "awaiting_approval",
	backend: "signer",
	days: 90,
	account: owner,
	signerStatus: "pending",
};
const legacy = {
	id: "legacy-id",
	name: "Old EC2",
	agent: `0x${"12".repeat(20)}`,
	createdAt: Date.now(),
	validUntil: Date.now() + 86400000,
	state: "awaiting_approval",
	backend: "legacy",
	days: 7,
};
const status = () => ({
	version: 1,
	supported: true,
	region: "us-east-2",
	owner,
	keyStore: state.keyStore,
	canCreate: state.keyStore === "signer",
	pending: 0,
	capabilities: { create: state.keyStore === "signer", manage: true, sign: false, register: false },
	agents: state.rows,
});
vi.mock("wagmi", () => ({
	useConnection: () => ({ address: owner }),
	useWalletClient: () => ({ data: { signTypedData: state.sign } }),
}));
vi.mock("@/lib/hyperliquid", () => ({
	useHyperliquid: () => ({ env: "Mainnet" }),
	useExchange: () => ({ mutateAsync: state.approve }),
	useInfo: (method: string) =>
		method === "subAccounts"
			? { data: state.subs, isError: false }
			: { data: state.approved, isError: false, refetch: async () => ({ data: state.approved }) },
}));
vi.mock("@/lib/ec2-keys/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/ec2-keys/api")>();
	return {
		...actual,
		getEc2Keys: async () => {
			if (state.offline) throw Error("offline");
			return status();
		},
		createEc2Key: (...args: any[]) => state.create(...args),
		manageEc2Key: (...args: any[]) => state.manage(...args),
	};
});

import { Ec2KmsKeys } from "@/components/api-wallets/ec2-kms-keys";

let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => {
	await cleanup?.();
	state.offline = false;
	state.keyStore = "signer";
	state.rows = [];
	state.approved = [];
	state.subs = [];
	vi.clearAllMocks();
});
async function mount() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
		node = document.createElement("div"),
		root = createRoot(node),
		authorized = vi.fn();
	document.body.append(node);
	cleanup = async () => {
		await act(async () => root.unmount());
		client.clear();
		node.remove();
	};
	await act(async () => {
		root.render(
			<QueryClientProvider client={client}>
				<Ec2KmsKeys onAuthorized={authorized} />
			</QueryClientProvider>,
		);
	});
	await act(async () => {
		await new Promise((r) => setTimeout(r, 30));
	});
	return { node, authorized };
}
const button = (node: ParentNode, label: string) =>
	[...node.querySelectorAll("button")].find((b) => b.textContent === label)!;
const labelled = (label: string) => document.body.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
it("creates a signer-account key for the chosen account with a 90-day default, without signing anything on mount", async () => {
	state.subs = [{ name: "Bots", subAccountUser: sub, master: owner }];
	const { node } = await mount();
	expect(node.textContent).toContain("X1 signer account");
	expect(state.create).not.toHaveBeenCalled();
	expect(state.sign).not.toHaveBeenCalled();
	const select = node.querySelector<HTMLSelectElement>('select[aria-label="KMS key trading account"]')!;
	expect([...select.options].map((o) => o.textContent)).toEqual(["Main account", "Sub-account Bots"]);
	await act(async () => {
		select.value = sub;
		select.dispatchEvent(new Event("change", { bubbles: true }));
	});
	state.create.mockResolvedValue({ ...status(), createdAgentId: key.id, agents: [{ ...key, account: sub }] });
	await act(async () => button(node, "Create KMS key").click());
	expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ owner, account: sub, name: "X1 Key", days: 90 }));
	expect(node.textContent).toContain("Sub-account Bots");
	expect(node.textContent).toContain("Awaiting Hyperliquid approval");
	expect(state.approve).not.toHaveBeenCalled();
});
it("fails closed when the service is down, or cannot reach the signer account", async () => {
	state.offline = true;
	const down = await mount();
	expect(button(down.node, "Create KMS key").disabled).toBe(true);
	expect(down.node.textContent).toContain("EC2 key service unavailable");
	await cleanup?.();
	state.offline = false;
	state.keyStore = "unavailable";
	const { node } = await mount();
	expect(button(node, "Create KMS key").disabled).toBe(true);
	expect(node.textContent).toContain("cannot reach yet");
	expect(state.create).not.toHaveBeenCalled();
});
it("authorizes only on explicit action with a fresh valid_until, then waits for the signer to activate", async () => {
	state.rows = [key];
	const { node, authorized } = await mount();
	state.approve.mockImplementationOnce(async () => {
		state.approved = [{ address: agent, name: "X1Scdcdcdcdcdcd", validUntil: Date.now() + 90 * 86400000 }];
		return { status: "ok" };
	});
	const before = Date.now();
	await act(async () => button(node, "Authorize on Hyperliquid").click());
	const [{ agentAddress, agentName }] = state.approve.mock.calls[0];
	expect(agentAddress).toBe(agent);
	const until = Number(agentName.split(" valid_until ")[1]);
	expect(agentName.startsWith(`X1S${agent.slice(2, 14)} valid_until `)).toBe(true);
	expect(until).toBeGreaterThanOrEqual(before + 90 * 86400000);
	expect(authorized).toHaveBeenCalledOnce();
	expect(node.textContent).toContain("activates the key once it confirms");
});
it("an active key near expiry offers renewal", async () => {
	state.rows = [{ ...key, state: "approved", signerStatus: "active", validUntil: Date.now() + 5 * 86400000 }];
	state.approved = [{ address: agent, name: "X1S", validUntil: Date.now() + 5 * 86400000 }];
	const { node } = await mount();
	expect(node.textContent).toContain("Active · renew soon");
	expect(button(node, "Renew on Hyperliquid").disabled).toBe(false);
});
it("legacy keys are marked not usable for trading: no authorize, no enable; disable and delete remain", async () => {
	state.rows = [{ ...legacy, state: "disabled" }];
	const { node } = await mount();
	expect(node.textContent).toContain("legacy key(s) were created in the trading account");
	expect(node.querySelector('[data-kms-backend="legacy"]')).toBeTruthy();
	expect(button(node, "Authorize on Hyperliquid")).toBeUndefined();
	expect(labelled("Enable KMS key Old EC2")).toBeNull();
	expect(labelled("Delete KMS key Old EC2")).toBeTruthy();
	await cleanup?.();
	state.rows = [legacy];
	const live = await mount();
	expect(live.node.textContent).toContain("not usable for trading");
	await act(async () => labelled("Disable KMS key Old EC2").click());
	state.manage.mockImplementationOnce(async () => {
		state.rows = [{ ...legacy, state: "disabled" }];
		return { ...status(), updatedAgentId: legacy.id };
	});
	await act(async () => button(document.body, "Confirm disable").click());
	expect(state.manage).toHaveBeenCalledWith(
		expect.objectContaining({
			op: "disable",
			owner,
			key: expect.objectContaining({ id: legacy.id, backend: "legacy" }),
		}),
	);
});
it("delete asks for confirmation, warns to remove the Hyperliquid wallet, and signs only on confirm", async () => {
	state.rows = [key];
	const { node } = await mount();
	await act(async () => labelled("Delete KMS key X1 Key").click());
	expect(state.manage).not.toHaveBeenCalled();
	expect(document.body.textContent).toContain("Also remove this key’s Hyperliquid API wallet");
	state.manage.mockImplementationOnce(async () => {
		state.rows = [
			{ ...key, state: "pending_deletion", signerStatus: "disabled", deletionDate: Date.now() + 30 * 86400000 },
		];
		return { ...status(), updatedAgentId: key.id };
	});
	await act(async () => button(document.body, "Confirm delete").click());
	expect(state.manage).toHaveBeenCalledWith(
		expect.objectContaining({ op: "delete", owner, key: expect.objectContaining({ id: key.id }) }),
	);
	expect(state.manage.mock.calls[0][0]).not.toHaveProperty("days");
	expect(node.querySelector("[data-kms-state]")?.getAttribute("data-kms-state")).toBe("pending_deletion");
	expect(labelled("Cancel deletion of KMS key X1 Key")).toBeTruthy();
	expect(button(node, "Authorize on Hyperliquid").disabled).toBe(true);
});
it("disabled signer keys offer Enable, block authorization, and a cancelled dialog sends nothing", async () => {
	state.rows = [{ ...key, state: "disabled", signerStatus: "disabled" }];
	const { node } = await mount();
	expect(node.textContent).toContain("Disabled");
	expect(button(node, "Authorize on Hyperliquid").disabled).toBe(true);
	await act(async () => labelled("Enable KMS key X1 Key").click());
	await act(async () => button(document.body, "Cancel").click());
	expect(state.manage).not.toHaveBeenCalled();
	await act(async () => labelled("Rename KMS key X1 Key").click());
	expect(button(document.body, "Confirm rename").disabled).toBe(true);
});
