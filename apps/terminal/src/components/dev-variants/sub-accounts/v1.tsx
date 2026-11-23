import {
	ArrowsLeftRightIcon,
	CheckIcon,
	CodeIcon,
	CopyIcon,
	PlusIcon,
	SignOutIcon,
	SlidersHorizontalIcon,
	TrendDownIcon,
	TrendUpIcon,
	WalletIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { AutoIconStack } from "@/components/trade/auto/auto-icon-stack";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, modeLabel, short, usd, useAccounts } from "./data";
import { Frame, HeaderSlot, WalletTrigger } from "./frame";

const ENTER = "transition-[opacity,scale] duration-150 starting:scale-[0.97] starting:opacity-0";

export default function V1() {
	const api = useAccounts();
	const [open, setOpen] = useState(true);
	return (
		<Frame account={api.active}>
			<HeaderSlot>
				<WalletTrigger active={api.active} open={open} onClick={() => setOpen((o) => !o)} />
			</HeaderSlot>
			{open && <Menu api={api} />}
		</Frame>
	);
}

function Menu({ api }: { api: AccountsApi }) {
	const [moving, setMoving] = useState<string | null>("s1");
	const [creating, setCreating] = useState(false);
	return (
		<div
			className={cn(
				"absolute top-11 right-[52px] z-40 flex w-[340px] origin-top-right flex-col rounded-12 bg-overlay p-1 shadow-menu",
				ENTER,
			)}
		>
			<div className="flex items-center gap-3 px-2 pt-1.5 pb-2">
				<span className="grid size-8 place-items-center rounded-8 bg-fill text-fg-inverse">
					<WalletIcon weight="fill" className="size-4" />
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm font-medium">{api.active.name}</span>
					<span className="text-xs text-fg-muted tabular-nums">{short(api.active.address)}</span>
				</span>
				<button
					type="button"
					aria-label="Copy address"
					className="grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-control-hover hover:text-fg"
				>
					<CopyIcon className="size-4" />
				</button>
			</div>
			<div className="my-1 h-px bg-stroke-weak" />
			<div className="flex h-7 items-center justify-between pr-1 pl-2">
				<span className="text-2xs tracking-micro text-fg-muted uppercase">Accounts</span>
				<button
					type="button"
					onClick={() => setCreating((c) => !c)}
					className="inline-flex h-6 items-center gap-1 rounded-full bg-control px-2.5 text-xs hover:bg-control-hover"
				>
					<PlusIcon weight="bold" className="size-3" />
					New
				</button>
			</div>
			{creating && <CreateRow api={api} onDone={() => setCreating(false)} />}
			{api.accounts.map((a) => (
				<div key={a.id} className="flex flex-col">
					<AccountRow
						account={a}
						active={a.id === api.activeId}
						moving={moving === a.id}
						onSelect={() => api.switchTo(a.id)}
						onMove={() => setMoving((m) => (m === a.id ? null : a.id))}
					/>
					{moving === a.id && !a.master && <MoveRow api={api} account={a} />}
				</div>
			))}
			<div className="my-1 h-px bg-stroke-weak" />
			<Item icon={<CodeIcon className="size-4" />} label="API wallets" />
			<Item icon={<SlidersHorizontalIcon className="size-4" />} label="Trading setup" detail="0.05% fee" />
			<div className="my-1 h-px bg-stroke-weak" />
			<Item icon={<SignOutIcon className="size-4" />} label="Disconnect" />
		</div>
	);
}

interface RowProps {
	account: Account;
	active: boolean;
	moving: boolean;
	onSelect: () => void;
	onMove: () => void;
}

function AccountRow({ account, active, moving, onSelect, onMove }: RowProps) {
	return (
		<div className="group flex items-center gap-1 rounded-8 hover:bg-control">
			<button
				type="button"
				onClick={onSelect}
				className="flex min-w-0 flex-1 items-center gap-2.5 py-1.5 pl-2 text-left"
			>
				<span className="grid size-7 shrink-0 place-items-center rounded-full bg-control-hover text-xs font-medium">
					{account.name[0]}
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="flex items-center gap-1.5 text-xs font-medium">
						{account.name}
						{active && <CheckIcon weight="bold" className="size-3" />}
					</span>
					<ModeLine account={account} />
				</span>
				<span className="text-xs tabular-nums">{usd(account.balance)}</span>
			</button>
			{account.master ? (
				<span className="w-8" />
			) : (
				<button
					type="button"
					aria-label={`Move funds for ${account.name}`}
					onClick={onMove}
					className={cn(
						"mr-1 grid size-7 shrink-0 place-items-center rounded-8 text-fg-muted hover:bg-control-hover hover:text-fg",
						moving && "bg-control-hover text-fg",
					)}
				>
					<ArrowsLeftRightIcon className="size-3.5" />
				</button>
			)}
		</div>
	);
}

function ModeLine({ account }: { account: Account }) {
	const { mode } = account;
	if (mode.kind === "basket")
		return (
			<span className="flex items-center gap-1.5 text-xs text-fg-muted">
				<AutoIconStack coins={mode.markets} max={3} size="size-3.5" />
				{modeLabel(mode)}
			</span>
		);
	if (mode.kind === "copy")
		return (
			<span className="flex items-center gap-1 text-xs text-fg-muted">
				{mode.bias === "bullish" ? (
					<TrendUpIcon weight="bold" className="size-3 text-market-up" />
				) : (
					<TrendDownIcon weight="bold" className="size-3 text-market-down" />
				)}
				{modeLabel(mode)}
			</span>
		);
	return <span className="text-xs text-fg-muted">Manual</span>;
}

function MoveRow({ api, account }: { api: AccountsApi; account: Account }) {
	const [toSub, setToSub] = useState(true);
	const [amount, setAmount] = useState("");
	const main = api.accounts[0];
	const source = toSub ? main : account;
	function submit() {
		const ok = toSub
			? api.transfer(main.id, account.id, Number(amount))
			: api.transfer(account.id, main.id, Number(amount));
		if (ok) setAmount("");
	}
	return (
		<div className={cn("mx-1 mb-1 flex flex-col gap-2 rounded-8 bg-control p-2", ENTER)}>
			<div className="flex h-7 rounded-8 bg-background p-0.5 text-xs">
				<button
					type="button"
					onClick={() => setToSub(true)}
					className={cn("flex-1 rounded-6", toSub ? "bg-control-hover text-fg" : "text-fg-muted")}
				>
					Main to {account.name}
				</button>
				<button
					type="button"
					onClick={() => setToSub(false)}
					className={cn("flex-1 rounded-6", !toSub ? "bg-control-hover text-fg" : "text-fg-muted")}
				>
					{account.name} to Main
				</button>
			</div>
			<div className="flex items-center gap-2">
				<span className="flex h-8 flex-1 items-center gap-1 rounded-8 bg-background px-2.5 text-xs">
					<span className="text-fg-muted">$</span>
					<input
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						inputMode="decimal"
						placeholder="0.00"
						className="w-full bg-transparent tabular-nums outline-none"
					/>
					<button
						type="button"
						onClick={() => setAmount(String(source.balance))}
						className="text-fg-muted hover:text-fg"
					>
						Max
					</button>
				</span>
				<button
					type="button"
					onClick={submit}
					className="h-8 rounded-8 bg-fill px-3 text-xs font-medium text-fg-inverse hover:opacity-90"
				>
					Move
				</button>
			</div>
			<span className="text-xs text-fg-muted tabular-nums">
				{usd(source.balance)} available in {source.name}
			</span>
		</div>
	);
}

function CreateRow({ api, onDone }: { api: AccountsApi; onDone: () => void }) {
	const [name, setName] = useState("");
	function submit() {
		if (api.create(name)) {
			setName("");
			onDone();
		}
	}
	return (
		<div className={cn("mx-1 mb-1 flex flex-col gap-2 rounded-8 bg-control p-2", ENTER)}>
			<div className="flex items-center gap-2">
				<input
					maxLength={16}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					placeholder="Sub-account name"
					className="h-8 flex-1 rounded-8 bg-background px-2.5 text-xs outline-none"
				/>
				<button
					type="button"
					onClick={submit}
					className="h-8 rounded-8 bg-fill px-3 text-xs font-medium text-fg-inverse hover:opacity-90"
				>
					Create
				</button>
			</div>
			<span className="text-xs text-fg-muted">Starts empty and manual. Move funds in after.</span>
		</div>
	);
}

function Item({ icon, label, detail }: { icon: ReactNode; label: string; detail?: string }) {
	return (
		<button type="button" className="flex h-7 items-center gap-2 rounded-8 px-2 text-xs hover:bg-control">
			<span className="text-fg-muted">{icon}</span>
			{label}
			{detail && <span className="ml-auto text-fg-muted">{detail}</span>}
		</button>
	);
}
