import { ArrowDownIcon, ArrowUpIcon, CheckIcon, PlusIcon, TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { AutoIconStack } from "@/components/trade/auto/auto-icon-stack";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, compactUsd, short, usd, useAccounts } from "./data";
import { Frame, HeaderSlot, WalletTrigger } from "./frame";

const ENTER = "transition-[opacity,scale] duration-150 starting:scale-[0.97] starting:opacity-0";

export default function V2() {
	const api = useAccounts();
	const total = api.accounts.reduce((s, a) => s + a.balance, 0);
	const bots = api.accounts.filter((a) => a.mode.kind !== "manual").length;
	return (
		<Frame>
			<HeaderSlot>
				<WalletTrigger active={api.active} />
			</HeaderSlot>
			<div className="absolute inset-x-0 top-12 bottom-0 overflow-auto bg-background px-10 pt-8 pb-10">
				<div className="mx-auto flex max-w-[1200px] flex-col gap-6">
					<div className="flex items-end justify-between">
						<div className="flex flex-col gap-1">
							<h1 className="text-base font-medium">Accounts</h1>
							<span className="text-xs text-fg-muted tabular-nums">
								{usd(total)} across {api.accounts.length} accounts. {bots} running a bot.
							</span>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-4">
						{api.accounts.map((a) => (
							<AccountCard key={a.id} api={api} account={a} active={a.id === api.activeId} />
						))}
						<CreateCard api={api} />
					</div>
				</div>
			</div>
		</Frame>
	);
}

function AccountCard({ api, account, active }: { api: AccountsApi; account: Account; active: boolean }) {
	const [dir, setDir] = useState<"in" | "out" | null>(null);
	return (
		<div className="flex flex-col gap-4 rounded-12 bg-surface p-4">
			<div className="flex items-center gap-3">
				<span className="grid size-9 shrink-0 place-items-center rounded-full bg-control text-sm font-medium">
					{account.name[0]}
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-medium">{account.name}</span>
					<span className="text-xs text-fg-muted tabular-nums">
						{account.master ? "Master" : "Sub-account"} {short(account.address)}
					</span>
				</span>
				{active ? (
					<span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-control px-3 text-xs">
						<CheckIcon weight="bold" className="size-3" />
						Trading
					</span>
				) : (
					<button
						type="button"
						onClick={() => api.switchTo(account.id)}
						className="h-8 rounded-full bg-fill px-3.5 text-xs font-medium text-fg-inverse hover:opacity-90"
					>
						Trade
					</button>
				)}
			</div>
			<div className="flex flex-col gap-0.5">
				<span className="text-2xs text-fg-muted">Account equity</span>
				<span className="text-lg font-medium tabular-nums">{usd(account.balance)}</span>
			</div>
			<ModeBlock account={account} />
			{account.master ? (
				<span className="text-xs text-fg-muted">Fund a sub-account from its own card.</span>
			) : (
				<div className="flex gap-2">
					<DirButton
						label="Add from Main"
						icon={<ArrowDownIcon className="size-3.5" />}
						on={dir === "in"}
						onClick={() => setDir(dir === "in" ? null : "in")}
					/>
					<DirButton
						label="Return to Main"
						icon={<ArrowUpIcon className="size-3.5" />}
						on={dir === "out"}
						onClick={() => setDir(dir === "out" ? null : "out")}
					/>
				</div>
			)}
			{dir && <AmountRow key={dir} api={api} account={account} dir={dir} onDone={() => setDir(null)} />}
		</div>
	);
}

function DirButton({ label, icon, on, onClick }: { label: string; icon: ReactNode; on: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-8 bg-control text-xs hover:bg-control-hover",
				on && "bg-control-hover",
			)}
		>
			{icon}
			{label}
		</button>
	);
}

function ModeBlock({ account }: { account: Account }) {
	const { mode } = account;
	if (mode.kind === "copy")
		return (
			<div className="flex items-center gap-3 rounded-8 bg-control px-3 py-2.5">
				<span className="size-2 rounded-full bg-market-up" />
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-xs">Copying {mode.trader.name}</span>
					<span className="text-xs text-fg-muted tabular-nums">
						Leaderboard #{mode.trader.rank}, {compactUsd(mode.trader.pnl)} PNL this week
					</span>
				</span>
				{mode.bias === "bullish" ? (
					<TrendUpIcon weight="bold" className="size-4 text-market-up" />
				) : (
					<TrendDownIcon weight="bold" className="size-4 text-market-down" />
				)}
			</div>
		);
	if (mode.kind === "basket")
		return (
			<div className="flex items-center gap-3 rounded-8 bg-control px-3 py-2.5">
				<span className="size-2 rounded-full bg-market-up" />
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-xs">Auto basket</span>
					<span className="text-xs text-fg-muted">Mood Ring, {mode.markets.length} markets</span>
				</span>
				<AutoIconStack coins={mode.markets} max={4} />
			</div>
		);
	return (
		<div className="flex items-center gap-3 rounded-8 bg-control px-3 py-2.5">
			<span className="size-2 rounded-full bg-fg-disabled" />
			<span className="flex flex-col">
				<span className="text-xs">Manual</span>
				<span className="text-xs text-fg-muted">No bot on this account</span>
			</span>
		</div>
	);
}

function AmountRow({
	api,
	account,
	dir,
	onDone,
}: {
	api: AccountsApi;
	account: Account;
	dir: "in" | "out";
	onDone: () => void;
}) {
	const [amount, setAmount] = useState("");
	const main = api.accounts[0];
	const source = dir === "in" ? main : account;
	function submit() {
		const ok =
			dir === "in"
				? api.transfer(main.id, account.id, Number(amount))
				: api.transfer(account.id, main.id, Number(amount));
		if (ok) onDone();
	}
	return (
		<div className={cn("flex items-center gap-2", ENTER)}>
			<span className="flex h-8 flex-1 items-center gap-1 rounded-8 bg-control px-2.5 text-xs">
				<span className="text-fg-muted">$</span>
				<input
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					inputMode="decimal"
					placeholder={`Up to ${usd(source.balance)}`}
					className="w-full bg-transparent tabular-nums outline-none"
				/>
				<button type="button" onClick={() => setAmount(String(source.balance))} className="text-fg-muted hover:text-fg">
					Max
				</button>
			</span>
			<button
				type="button"
				onClick={submit}
				className="h-8 rounded-8 bg-fill px-3 text-xs font-medium text-fg-inverse hover:opacity-90"
			>
				Confirm
			</button>
		</div>
	);
}

function CreateCard({ api }: { api: AccountsApi }) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [fund, setFund] = useState("");
	if (!open)
		return (
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-12 bg-surface text-xs text-fg-muted hover:bg-control hover:text-fg"
			>
				<span className="grid size-9 place-items-center rounded-full bg-control">
					<PlusIcon weight="bold" className="size-4" />
				</span>
				New sub-account
			</button>
		);
	function submit() {
		if (api.create(name, { fund: Number(fund) || 0 })) {
			setName("");
			setFund("");
			setOpen(false);
		}
	}
	return (
		<div className={cn("flex flex-col gap-3 rounded-12 bg-surface p-4", ENTER)}>
			<span className="text-sm font-medium">New sub-account</span>
			<label className="flex flex-col gap-1 text-xs text-fg-muted">
				Name
				<input
					maxLength={16}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g. ETH swing"
					className="h-9 rounded-8 bg-control px-3 text-sm text-fg outline-none"
				/>
			</label>
			<label className="flex flex-col gap-1 text-xs text-fg-muted">
				Starting balance from Main (optional)
				<input
					value={fund}
					onChange={(e) => setFund(e.target.value)}
					inputMode="decimal"
					placeholder="$0.00"
					className="h-9 rounded-8 bg-control px-3 text-sm text-fg tabular-nums outline-none"
				/>
			</label>
			<span className="text-xs text-fg-muted">Hyperliquid unlocks sub-accounts after $100,000 in trading volume.</span>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => setOpen(false)}
					className="h-9 flex-1 rounded-8 bg-control text-xs hover:bg-control-hover"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={submit}
					className="h-9 flex-1 rounded-8 bg-fill text-xs font-medium text-fg-inverse hover:opacity-90"
				>
					Create
				</button>
			</div>
		</div>
	);
}
