import { Modal, ModalContent, ModalFooter, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { CheckIcon, CloudIcon, CopyIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { type Address, zeroAddress } from "viem";
import { useConnection, useWalletClient } from "wagmi";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { cn } from "@/lib/cn";
import {
	APPROVAL_DAYS,
	createEc2Key,
	DEFAULT_APPROVAL_DAYS,
	EC2_UNAVAILABLE,
	type Ec2Key,
	type Ec2ManageOp,
	ec2AgentName,
	getEc2Keys,
	manageEc2Key,
	renewDue,
	SIGNER_DEFAULT_LIMITS,
	signerKeyLabel,
	signerKeyTone,
} from "@/lib/ec2-keys/api";
import { useExchange, useHyperliquid, useInfo } from "@/lib/hyperliquid";
import { agentApprovalCurrent } from "@/lib/trade/api-wallets";

const field =
	"w-full min-w-0 rounded-lg border border-stroke-weak bg-background px-3 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-40";
const small = "rounded-md border border-stroke-weak px-2 py-1 text-2xs hover:bg-fill-hover disabled:opacity-40";
const OP_TITLE: Record<Ec2ManageOp, string> = {
	rename: "Rename",
	disable: "Disable",
	enable: "Enable",
	delete: "Delete",
	"cancel-delete": "Cancel deletion",
};
const OP_DONE: Record<Ec2ManageOp, string> = {
	rename: "Key renamed.",
	disable: "Key disabled. The X1 signer stops signing with it at once.",
	enable: "Key enabled. It signs again after its Hyperliquid approval is re-checked.",
	delete: "Key deletion scheduled. Remove its Hyperliquid API wallet below as well.",
	"cancel-delete": "Deletion cancelled. The key stays disabled until you enable it.",
};
const LIMITS_TEXT = `${SIGNER_DEFAULT_LIMITS.maxLeverage}x leverage, ${SIGNER_DEFAULT_LIMITS.maxGrossLev}x gross exposure, $${SIGNER_DEFAULT_LIMITS.maxOrderUsd.toLocaleString()} per order, ${SIGNER_DEFAULT_LIMITS.maxOrdersPerMin} new orders a minute`;
type Pending = { op: Ec2ManageOp; key: Ec2Key };
type SubAccount = { name: string; subAccountUser: Address; master: Address };

function connectionLabel(owner: Address | undefined, env: string, fetching: boolean, ready: boolean, store?: string) {
	if (!owner) return "Connect owner wallet";
	if (env !== "Mainnet") return "Mainnet required";
	if (fetching && !ready) return "Connecting…";
	if (!ready) return EC2_UNAVAILABLE;
	if (store === "signer") return "X1 signer account · us-east-2";
	return "New keys unavailable";
}

export function Ec2KmsKeys({ onAuthorized }: { onAuthorized: () => void }) {
	const { address: owner } = useConnection(),
		{ data: wallet } = useWalletClient(),
		{ env } = useHyperliquid(),
		client = useQueryClient();
	const identity = useRef({ owner, env });
	identity.current = { owner, env };
	const alive = useRef(true),
		lock = useRef(false);
	const [name, setName] = useState("X1 Key"),
		[days, setDays] = useState(DEFAULT_APPROVAL_DAYS),
		[account, setAccount] = useState(""),
		[error, setError] = useState<string | null>(null),
		[message, setMessage] = useState<string | null>(null);
	const [pending, setPending] = useState<Pending | null>(null),
		[rename, setRename] = useState("");
	useEffect(() => {
		alive.current = true;
		setError(null);
		setMessage(null);
		setPending(null);
		setAccount("");
		return () => {
			alive.current = false;
		};
	}, [owner, env]);
	const enabled = !!owner && env === "Mainnet",
		queryKey = ["ec2-kms-keys", env, owner];
	const keys = useQuery({
		queryKey,
		queryFn: ({ signal }) => getEc2Keys(owner!, signal),
		enabled,
		retry: false,
		refetchInterval: 15000,
		refetchOnWindowFocus: true,
	});
	const approvals = useInfo(
		"extraAgents",
		{ user: owner ?? zeroAddress },
		{ enabled: !!owner, refetchOnWindowFocus: true },
	);
	const subAccounts = useInfo("subAccounts", { user: owner ?? zeroAddress }, { enabled: !!owner });
	const ownedSubs = ((subAccounts.data ?? []) as SubAccount[]).filter(
		(s) => !!owner && s.master.toLowerCase() === owner.toLowerCase(),
	);
	const target = (account || owner) as Address | undefined;
	const approve = useExchange("approveAgent");
	const approved = (key: Ec2Key) =>
		!!approvals.data?.some(
			(a) => a.address.toLowerCase() === key.agent.toLowerCase() && agentApprovalCurrent(a.validUntil),
		);
	function accountLabel(address?: Address) {
		if (!address || !owner) return "";
		if (address.toLowerCase() === owner.toLowerCase()) return "Main account";
		const sub = ownedSubs.find((s) => s.subAccountUser.toLowerCase() === address.toLowerCase());
		return sub ? `Sub-account ${sub.name}` : `Sub-account ${address.slice(0, 6)}…${address.slice(-4)}`;
	}
	function authorizeLabel(key: Ec2Key) {
		if (!approved(key)) return "Authorize on Hyperliquid";
		if (renewDue(key)) return "Renew on Hyperliquid";
		return "Authorized";
	}
	function canAuthorize(key: Ec2Key) {
		if (key.backend !== "signer" || key.state === "disabled" || key.state === "pending_deletion") return false;
		return !approved(key) || renewDue(key);
	}
	const mutation = useMutation({
		retry: false,
		mutationFn: async ({
			action,
			key,
			op,
		}: {
			action: "create" | "approve" | "manage";
			key?: Ec2Key;
			op?: Ec2ManageOp;
		}) => {
			if (lock.current) throw Error("Another key action is pending.");
			lock.current = true;
			const startOwner = owner,
				startEnv = env;
			const check = () => {
				if (!alive.current || identity.current.owner !== startOwner || identity.current.env !== startEnv)
					throw Error("Wallet or network changed. Start again with the intended owner.");
			};
			try {
				check();
				if (!enabled || !owner || !wallet || keys.isError || !keys.data)
					throw Error("Connect the owner wallet and the key service first.");
				setError(null);
				if (action === "create") {
					if (!keys.data.canCreate || !target)
						throw Error("Key quota reached, creation unavailable, or a previous request is being finished.");
					setMessage(
						"Confirm key creation in your owner wallet. This creates a billable KMS key in the X1 signer account; it does not authorize trading.",
					);
					const status = await createEc2Key({
						owner,
						account: target,
						name: name.trim(),
						days,
						assertOwner: check,
						sign: (args) => wallet.signTypedData(args),
					});
					check();
					client.setQueryData(queryKey, status);
					setMessage("Key created in the X1 signer account. Authorize its address on Hyperliquid below.");
				} else if (action === "manage") {
					if (!op || !key || !keys.data.agents.some((a) => a.id === key.id && a.agent === key.agent))
						throw Error("Select a key belonging to this owner.");
					setMessage(`Confirm “${OP_TITLE[op]}” in your owner wallet.`);
					const status = await manageEc2Key({
						op,
						owner,
						key,
						...(op === "rename" ? { name: rename.trim() } : {}),
						assertOwner: check,
						sign: (args) => wallet.signTypedData(args),
					});
					check();
					client.setQueryData(queryKey, status);
					setPending(null);
					setMessage(OP_DONE[op]);
				} else {
					if (!key || !keys.data.agents.some((a) => a.id === key.id && a.agent === key.agent) || !canAuthorize(key))
						throw Error("Select a current signer-account key belonging to this owner.");
					const current = await approvals.refetch();
					check();
					if (current.error || !current.data) throw Error("Could not verify existing Hyperliquid authorizations.");
					const approvalName = ec2AgentName(key),
						base = approvalName.split(" valid_until ")[0];
					if (
						current.data.some(
							(a) => a.name.split(" valid_until ")[0] === base && a.address.toLowerCase() !== key.agent.toLowerCase(),
						)
					)
						throw Error("An existing agent uses this approval name. No replacement was submitted.");
					setMessage("Confirm API wallet authorization in your owner wallet.");
					await approve.mutateAsync({ agentAddress: key.agent, agentName: approvalName });
					check();
					const result = await approvals.refetch();
					check();
					if (
						result.error ||
						!result.data?.some(
							(a) => a.address.toLowerCase() === key.agent.toLowerCase() && agentApprovalCurrent(a.validUntil),
						)
					)
						throw Error("Authorization submitted but not verified. Refresh before retrying.");
					onAuthorized();
					void keys.refetch();
					setMessage(
						"Authorized on Hyperliquid. The X1 signer activates the key once it confirms this approval and the X1 builder fee.",
					);
				}
			} catch (e) {
				if (alive.current && identity.current.owner === startOwner && identity.current.env === startEnv) {
					setMessage(null);
					setError(e instanceof Error ? e.message : "Key action could not be confirmed.");
				}
				throw e;
			} finally {
				lock.current = false;
			}
		},
	});
	const busy = mutation.isPending,
		ready = enabled && keys.isSuccess && !keys.isError,
		manage = ready && !!keys.data?.capabilities.manage && !!wallet,
		legacyKeys = keys.data?.agents.filter((k) => k.backend === "legacy") ?? [];
	function ask(op: Ec2ManageOp, key: Ec2Key) {
		setError(null);
		setMessage(null);
		setRename(key.name);
		setPending({ op, key });
	}
	return (
		<section aria-label="KMS keys" className="rounded-xl border border-stroke-weak bg-surface p-4 space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="inline-flex items-center gap-2 text-sm font-medium">
					<CloudIcon className="size-4" />
					AWS KMS keys
				</h2>
				<div className="flex items-center gap-3">
					<span className={cn("text-xs", ready && keys.data?.keyStore === "signer" ? "text-success" : "text-fg-muted")}>
						{connectionLabel(owner, env, keys.isFetching, ready, keys.data?.keyStore)}
					</span>
					<button
						type="button"
						disabled={!enabled || keys.isFetching || busy}
						onClick={() => void keys.refetch()}
						className="text-xs text-brand disabled:opacity-40"
					>
						Refresh KMS
					</button>
				</div>
			</div>
			<p className="text-xs text-fg-muted">
				Create a non-exportable key in the X1 signer account. The private key stays in AWS KMS and only the X1 policy
				signer can sign with it, for the one account you choose, within {LIMITS_TEXT}. Creating a key is billable.
			</p>
			<div className="grid items-end gap-3 sm:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_auto_auto]">
				<label className="space-y-1 text-xs text-fg-muted">
					<span>Key name</span>
					<input
						aria-label="KMS key name"
						value={name}
						maxLength={16}
						disabled={busy}
						onChange={(e) => setName(e.target.value)}
						className={field}
					/>
				</label>
				<label className="space-y-1 text-xs text-fg-muted">
					<span>Trading account</span>
					<select
						aria-label="KMS key trading account"
						value={account}
						disabled={busy || !owner}
						onChange={(e) => setAccount(e.target.value)}
						className={field}
					>
						<option value="">Main account</option>
						{ownedSubs.map((s) => (
							<option key={s.subAccountUser} value={s.subAccountUser}>
								Sub-account {s.name}
							</option>
						))}
					</select>
				</label>
				<label className="space-y-1 text-xs text-fg-muted">
					<span>Approval duration</span>
					<select
						aria-label="KMS approval duration"
						value={days}
						disabled={busy}
						onChange={(e) => setDays(Number(e.target.value))}
						className={field}
					>
						{APPROVAL_DAYS.map((d) => (
							<option key={d} value={d}>
								{d} days
							</option>
						))}
					</select>
				</label>
				<button
					type="button"
					disabled={!ready || !keys.data?.canCreate || !wallet || busy || !/^[-\w ]{1,16}$/.test(name.trim())}
					onClick={() => mutation.mutate({ action: "create" })}
					className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-fg-inverse disabled:opacity-40"
				>
					{busy ? "Confirming…" : "Create KMS key"}
				</button>
			</div>
			{!ready && enabled && keys.isError && (
				<output className="block text-xs text-warning">
					{EC2_UNAVAILABLE} Creation and changes stay disabled until it responds. Keys already authorized on Hyperliquid
					keep working.
				</output>
			)}
			{ready && keys.data?.keyStore === "unavailable" && (
				<output className="block text-xs text-warning">
					New keys are created in the X1 signer account, which this service cannot reach yet. Existing keys can still be
					managed.
				</output>
			)}
			{!!keys.data?.pending && (
				<output className="block text-xs text-warning">
					{keys.data.pending} creation request(s) are being finished. Refresh; do not create replacements.
				</output>
			)}
			{!!legacyKeys.length && (
				<output className="block text-xs text-warning">
					{legacyKeys.length} legacy key(s) were created in the trading account. The X1 signer can never use them:
					disable or delete them, and remove their Hyperliquid API wallets below.
				</output>
			)}
			{!pending && message && <output className="block text-xs text-brand">{message}</output>}
			{!pending && error && (
				<p role="alert" className="text-xs text-error">
					{error}
				</p>
			)}
			{ready && !!keys.data?.agents.length && (
				<div className="divide-y divide-stroke-weak border-t border-stroke-weak">
					{keys.data.agents.map((key) => (
						<div
							key={key.id}
							data-kms-key={key.id}
							data-kms-backend={key.backend}
							className="flex flex-wrap items-center justify-between gap-3 py-3"
						>
							<div className="min-w-0 space-y-1">
								<div className="flex flex-wrap items-center gap-2 text-xs">
									<strong>{key.name}</strong>
									{key.backend === "signer" && <span className="text-fg-muted">{accountLabel(key.account)}</span>}
									<span data-kms-state={key.state} className={signerKeyTone(key)}>
										{signerKeyLabel(key, approved(key))}
									</span>
								</div>
								<KmsAddress agent={key.agent} />
								<p className="text-2xs text-fg-muted">
									{key.backend === "signer"
										? `Approval: ${key.days} days · Expires ${new Date(key.validUntil).toLocaleString()}`
										: "Created in the trading account. Remove its Hyperliquid API wallet below."}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-1.5">
								{key.backend === "signer" && (
									<button
										type="button"
										disabled={busy || !wallet || !canAuthorize(key) || approvals.isError}
										onClick={() => mutation.mutate({ action: "approve", key })}
										className="rounded-lg border border-stroke-weak px-3 py-2 text-xs text-brand disabled:opacity-40"
									>
										{authorizeLabel(key)}
									</button>
								)}
								<button
									type="button"
									aria-label={`Rename KMS key ${key.name}`}
									disabled={busy || !manage}
									onClick={() => ask("rename", key)}
									className={cn(small, "text-brand")}
								>
									Rename
								</button>
								{key.state === "disabled" && key.backend === "signer" && (
									<button
										type="button"
										aria-label={`Enable KMS key ${key.name}`}
										disabled={busy || !manage}
										onClick={() => ask("enable", key)}
										className={cn(small, "text-brand")}
									>
										Enable
									</button>
								)}
								{key.state !== "disabled" && key.state !== "pending_deletion" && (
									<button
										type="button"
										aria-label={`Disable KMS key ${key.name}`}
										disabled={busy || !manage}
										onClick={() => ask("disable", key)}
										className={cn(small, "text-warning")}
									>
										Disable
									</button>
								)}
								{key.state === "pending_deletion" ? (
									<button
										type="button"
										aria-label={`Cancel deletion of KMS key ${key.name}`}
										disabled={busy || !manage}
										onClick={() => ask("cancel-delete", key)}
										className={cn(small, "text-brand")}
									>
										Cancel deletion
									</button>
								) : (
									<button
										type="button"
										aria-label={`Delete KMS key ${key.name}`}
										disabled={busy || !manage}
										onClick={() => ask("delete", key)}
										className={cn(small, "border-error/30 text-error")}
									>
										Delete
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
			<p className="text-2xs text-fg-muted">
				This page creates, authorizes and manages keys only; it never signs a trade. A key signs only after Hyperliquid
				shows your approval and the X1 builder fee. Removing an API wallet below revokes Hyperliquid access; deleting a
				KMS key here does not remove its Hyperliquid approval.
			</p>
			{pending && (
				<Modal
					open
					onOpenChange={(open) => {
						if (!open && !busy) setPending(null);
					}}
				>
					<ModalPopup size="sm">
						<ModalHeader>
							<ModalTitle>
								{OP_TITLE[pending.op]} {pending.key.name}?
							</ModalTitle>
						</ModalHeader>
						<ModalContent className="space-y-3">
							<p className="break-all font-mono text-xs text-fg-muted">{pending.key.agent}</p>
							{pending.op === "rename" && (
								<label className="block space-y-1 text-xs text-fg-muted">
									<span>New name</span>
									<input
										aria-label="New KMS key name"
										value={rename}
										maxLength={16}
										disabled={busy}
										onChange={(e) => setRename(e.target.value)}
										className={field}
									/>
								</label>
							)}
							{pending.op === "rename" && (
								<p className="text-xs">
									Changes the display name only. The key and its Hyperliquid approval name stay the same.
								</p>
							)}
							{pending.op === "disable" && (
								<p className="text-sm">
									The key cannot sign while disabled. Its Hyperliquid approval stays in place; you can enable it again.
								</p>
							)}
							{pending.op === "enable" && (
								<p className="text-sm">
									The X1 signer signs with it again once it re-checks the Hyperliquid approval and the builder fee.
								</p>
							)}
							{pending.op === "delete" && (
								<>
									<p className="text-sm">
										Schedules permanent deletion of this AWS KMS key in 30 days. Until then you can cancel. After
										deletion the key and its address can never sign again.
									</p>
									<p className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs text-warning">
										Also remove this key’s Hyperliquid API wallet in the list below. Deleting the KMS key does not
										revoke the approval on Hyperliquid.
									</p>
								</>
							)}
							{pending.op === "cancel-delete" && (
								<p className="text-sm">Keeps the key. It stays disabled until you enable it.</p>
							)}
							<p className="text-xs text-fg-muted">Confirm with your owner wallet signature.</p>
							{message && <output className="block text-xs text-brand">{message}</output>}
							{error && (
								<p role="alert" className="text-xs text-error">
									{error}
								</p>
							)}
						</ModalContent>
						<ModalFooter>
							<button
								type="button"
								disabled={busy}
								onClick={() => setPending(null)}
								className="px-4 py-2 text-sm text-fg-muted"
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={
									busy ||
									(pending.op === "rename" &&
										(!/^[-\w ]{1,16}$/.test(rename.trim()) || rename.trim() === pending.key.name))
								}
								onClick={() => mutation.mutate({ action: "manage", key: pending.key, op: pending.op })}
								className={cn(
									"rounded-lg px-4 py-2 text-sm text-fg-inverse disabled:opacity-40",
									pending.op === "delete" || pending.op === "disable" ? "bg-error" : "bg-brand",
								)}
							>
								{busy ? "Confirm in wallet…" : `Confirm ${OP_TITLE[pending.op].toLowerCase()}`}
							</button>
						</ModalFooter>
					</ModalPopup>
				</Modal>
			)}
		</section>
	);
}
function KmsAddress({ agent }: { agent: Address }) {
	const { copy, copied } = useCopyToClipboard(1800);
	return (
		<div className="flex min-w-0 items-center gap-2 text-xs">
			<span className="break-all select-all">{agent}</span>
			<button
				type="button"
				aria-label={`Copy KMS address ${agent}`}
				className="shrink-0 text-brand"
				onClick={() => void copy(agent)}
			>
				{copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
			</button>
		</div>
	);
}
