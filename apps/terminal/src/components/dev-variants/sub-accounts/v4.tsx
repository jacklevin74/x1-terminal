import { ArrowDownIcon, CaretDownIcon, CheckIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { AutoIconStack } from "@/components/trade/auto/auto-icon-stack";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, modeLabel, usd, useAccounts } from "./data";
import { Frame, HeaderSlot, WalletTrigger } from "./frame";

const ENTER = "transition-[opacity,scale] duration-150 starting:scale-[0.97] starting:opacity-0";
const PCTS = [25, 50, 100];

export default function V4() {
	const api = useAccounts();
	const [sheet, setSheet] = useState(true);
	return (
		<Frame>
			<HeaderSlot>
				<WalletTrigger active={api.active} />
			</HeaderSlot>
			<AccountsPanel api={api} onTransfer={() => setSheet(true)} />
			{sheet && (
				<div className="absolute inset-0 z-40 grid place-items-center bg-scrim">
					<TransferSheet api={api} onClose={() => setSheet(false)} />
				</div>
			)}
		</Frame>
	);
}

function AccountsPanel({ api, onTransfer }: { api: AccountsApi; onTransfer: () => void }) {
	return (
		<div className="absolute top-[660px] right-1 flex h-[210px] w-[345px] flex-col gap-1 rounded-8 bg-surface px-2 pt-3">
			<div className="flex items-center justify-between px-1 pb-1">
				<span className="text-2xs tracking-micro text-fg-muted uppercase">Accounts</span>
				<button
					type="button"
					onClick={onTransfer}
					className="h-6 rounded-full bg-control px-2.5 text-xs hover:bg-control-hover"
				>
					Transfer
				</button>
			</div>
			<div className="flex flex-col overflow-auto">
				{api.accounts.map((a) => (
					<button
						key={a.id}
						type="button"
						onClick={() => api.switchTo(a.id)}
						className={cn(
							"flex h-8 shrink-0 items-center gap-2 rounded-6 px-1.5 text-xs hover:bg-control",
							a.id === api.activeId && "bg-control",
						)}
					>
						<span className="w-24 truncate text-left">{a.name}</span>
						<span className="flex-1 truncate text-left text-fg-muted">{modeLabel(a.mode)}</span>
						<span className="tabular-nums">{usd(a.balance, 0)}</span>
					</button>
				))}
			</div>
		</div>
	);
}

type Slot = "from" | "to" | null;

function TransferSheet({ api, onClose }: { api: AccountsApi; onClose: () => void }) {
	const [fromId, setFromId] = useState("master");
	const [toId, setToId] = useState("s1");
	const [picking, setPicking] = useState<Slot>(null);
	const [amount, setAmount] = useState("");
	const from = api.accounts.find((a) => a.id === fromId) ?? api.accounts[0];
	const to = api.accounts.find((a) => a.id === toId) ?? api.accounts[1];
	const viaMain = !from.master && !to.master;
	function choose(slot: Slot, id: string) {
		if (slot === "from") {
			if (id === toId) setToId(fromId);
			setFromId(id);
		} else {
			if (id === fromId) setFromId(toId);
			setToId(id);
		}
		setPicking(null);
	}
	function flip() {
		setFromId(toId);
		setToId(fromId);
	}
	function submit() {
		if (api.transfer(from.id, to.id, Number(amount))) setAmount("");
	}
	return (
		<div className={cn("flex w-[440px] flex-col gap-3 rounded-12 bg-overlay p-5 shadow-menu", ENTER)}>
			<div className="flex items-center justify-between">
				<span className="text-base font-medium">Transfer USDC</span>
				<button
					type="button"
					aria-label="Close"
					onClick={onClose}
					className="grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-control-hover hover:text-fg"
				>
					<XIcon className="size-4" />
				</button>
			</div>
			<div className="relative flex flex-col gap-1">
				<Picker
					label="From"
					account={from}
					open={picking === "from"}
					onOpen={() => setPicking(picking === "from" ? null : "from")}
				/>
				{picking === "from" && <List api={api} selected={fromId} onPick={(id) => choose("from", id)} />}
				<div className="relative z-10 -my-3 flex justify-center">
					<button
						type="button"
						aria-label="Swap accounts"
						onClick={flip}
						className="grid size-8 place-items-center rounded-full bg-control-hover ring-4 ring-overlay hover:bg-fill-hover"
					>
						<ArrowDownIcon weight="bold" className="size-3.5" />
					</button>
				</div>
				<Picker
					label="To"
					account={to}
					open={picking === "to"}
					onOpen={() => setPicking(picking === "to" ? null : "to")}
				/>
				{picking === "to" && (
					<List
						api={api}
						selected={toId}
						onPick={(id) => choose("to", id)}
						canCreate
						onCreated={(id) => choose("to", id)}
					/>
				)}
			</div>
			<div className="flex flex-col gap-2 rounded-8 bg-control p-3">
				<span className="flex items-center gap-1 text-lg font-medium">
					<span className="text-fg-muted">$</span>
					<input
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						inputMode="decimal"
						placeholder="0.00"
						className="w-full bg-transparent tabular-nums outline-none"
					/>
				</span>
				<div className="flex items-center gap-1.5">
					{PCTS.map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => setAmount(((from.balance * p) / 100).toFixed(2))}
							className="h-6 rounded-full bg-control-hover px-2.5 text-xs hover:bg-fill-hover"
						>
							{p === 100 ? "Max" : `${p}%`}
						</button>
					))}
					<span className="ml-auto text-xs text-fg-muted tabular-nums">{usd(from.balance)} available</span>
				</div>
			</div>
			{viaMain && (
				<span className="text-xs text-fg-muted">
					Hyperliquid moves funds between sub-accounts through Main account. You sign two transfers.
				</span>
			)}
			<button
				type="button"
				onClick={submit}
				className="h-11 rounded-8 bg-fill text-sm font-medium text-fg-inverse hover:opacity-90"
			>
				Move to {to.name}
			</button>
		</div>
	);
}

interface PickerProps {
	label: string;
	account: Account;
	open: boolean;
	onOpen: () => void;
}

function Picker({ label, account, open, onOpen }: PickerProps) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className={cn(
				"flex items-center gap-3 rounded-8 bg-control px-3 py-3 text-left hover:bg-control-hover",
				open && "bg-control-hover",
			)}
		>
			<span className="grid size-9 shrink-0 place-items-center rounded-full bg-control-hover text-sm font-medium">
				{account.name[0]}
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="text-2xs text-fg-muted">{label}</span>
				<span className="text-sm">{account.name}</span>
				<span className="truncate text-xs text-fg-muted">{modeLabel(account.mode)}</span>
			</span>
			<span className="text-xs tabular-nums">{usd(account.balance)}</span>
			<CaretDownIcon weight="bold" className={cn("size-3 text-fg-muted transition-transform", open && "rotate-180")} />
		</button>
	);
}

interface ListProps {
	api: AccountsApi;
	selected: string;
	onPick: (id: string) => void;
	canCreate?: boolean;
	onCreated?: (id: string) => void;
}

function List({ api, selected, onPick, canCreate, onCreated }: ListProps) {
	const [naming, setNaming] = useState(false);
	const [name, setName] = useState("");
	function create() {
		const made = api.create(name);
		if (made && onCreated) onCreated(made.id);
	}
	return (
		<div className={cn("flex flex-col rounded-8 bg-control p-1", ENTER)}>
			{api.accounts.map((a) => (
				<button
					key={a.id}
					type="button"
					onClick={() => onPick(a.id)}
					className="flex h-9 items-center gap-2 rounded-6 px-2 text-xs hover:bg-control-hover"
				>
					<span className="w-24 truncate text-left">{a.name}</span>
					<span className="flex flex-1 items-center gap-1.5 truncate text-fg-muted">
						{a.mode.kind === "basket" && <AutoIconStack coins={a.mode.markets} max={3} size="size-3.5" />}
						{modeLabel(a.mode)}
					</span>
					<span className="tabular-nums">{usd(a.balance, 0)}</span>
					<span className="w-3">{a.id === selected && <CheckIcon weight="bold" className="size-3" />}</span>
				</button>
			))}
			{canCreate &&
				(naming ? (
					<div className="flex items-center gap-1.5 p-1">
						<input
							maxLength={16}
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && create()}
							placeholder="Sub-account name"
							className="h-8 flex-1 rounded-6 bg-background px-2.5 text-xs outline-none"
						/>
						<button
							type="button"
							onClick={create}
							className="h-8 rounded-6 bg-fill px-3 text-xs font-medium text-fg-inverse hover:opacity-90"
						>
							Create
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setNaming(true)}
						className="flex h-9 items-center gap-2 rounded-6 px-2 text-xs text-fg-secondary hover:bg-control-hover"
					>
						<PlusIcon weight="bold" className="size-3" />
						New sub-account
					</button>
				))}
		</div>
	);
}
