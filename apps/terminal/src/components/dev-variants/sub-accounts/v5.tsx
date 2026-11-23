import { CheckIcon, PauseIcon, PlayIcon, TrendUpIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { type AccountsApi, compactUsd, modeLabel, short, traders, usd, useAccounts } from "./data";
import { Frame, HeaderSlot, WalletTrigger } from "./frame";

const ENTER = "transition-[opacity,scale] duration-150 starting:scale-[0.97] starting:opacity-0";
const LEVERAGE = [2, 3, 5];
const TRADER = traders[3];

type Target = "new" | "main";

export default function V5() {
	const api = useAccounts();
	const [startedId, setStartedId] = useState<string | null>(null);
	return (
		<Frame>
			<HeaderSlot>
				<WalletTrigger active={api.active} />
			</HeaderSlot>
			<div className="absolute top-[136px] right-1 flex h-[519px] w-[345px] flex-col overflow-hidden rounded-8 bg-surface">
				<div className="flex h-9 shrink-0 bg-background text-xs">
					<span className="flex flex-1 items-center justify-center text-fg-muted">Manual</span>
					<span className="flex flex-1 items-center justify-center rounded-t-8 bg-surface font-medium">Auto</span>
				</div>
				{startedId ? (
					<Running api={api} id={startedId} onReset={() => setStartedId(null)} />
				) : (
					<Setup api={api} onStarted={setStartedId} />
				)}
			</div>
			<AccountsPanel api={api} />
		</Frame>
	);
}

function Setup({ api, onStarted }: { api: AccountsApi; onStarted: (id: string) => void }) {
	const [lev, setLev] = useState(3);
	const [target, setTarget] = useState<Target>("new");
	const [name, setName] = useState("JEFF copy");
	const [fund, setFund] = useState("2000");
	const main = api.accounts[0];
	function start() {
		if (target === "main") {
			toast.success(`Bot started on ${main.name}`);
			return;
		}
		const made = api.create(name, {
			fund: Number(fund) || 0,
			mode: { kind: "copy", trader: TRADER, bias: "bullish" },
			select: true,
		});
		if (made) onStarted(made.id);
	}
	return (
		<div className="flex flex-1 flex-col gap-4 overflow-auto px-3 pt-4 pb-3">
			<div className="flex flex-col gap-2">
				<span className="text-xs text-fg-muted">Copy trader</span>
				<div className="flex items-center gap-3 rounded-8 bg-control px-3 py-2.5">
					<span className="grid size-8 place-items-center rounded-full bg-control-hover text-xs font-medium">
						{TRADER.name[0].toUpperCase()}
					</span>
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="truncate text-xs font-medium">{TRADER.name}</span>
						<span className="text-xs text-fg-muted tabular-nums">
							#{TRADER.rank} this week, {short(TRADER.address)}
						</span>
					</span>
					<span className="flex items-center gap-1 text-xs text-market-up tabular-nums">
						<TrendUpIcon weight="bold" className="size-3" />
						{compactUsd(TRADER.pnl)}
					</span>
				</div>
			</div>
			<div className="flex items-center justify-between">
				<span className="text-xs text-fg-muted">Max leverage</span>
				<div className="flex h-7 rounded-8 bg-control p-0.5 text-xs">
					{LEVERAGE.map((l) => (
						<button
							key={l}
							type="button"
							onClick={() => setLev(l)}
							className={cn("w-10 rounded-6 tabular-nums", l === lev ? "bg-control-hover text-fg" : "text-fg-muted")}
						>
							{l}x
						</button>
					))}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<span className="text-xs text-fg-muted">Run this bot in</span>
				<Option
					on={target === "new"}
					onClick={() => setTarget("new")}
					title="A new sub-account"
					detail="Keeps this bot apart from your other trades."
				>
					{target === "new" && (
						<div className={cn("flex gap-2 pt-1", ENTER)}>
							<input
								maxLength={16}
								value={name}
								onChange={(e) => setName(e.target.value)}
								aria-label="Sub-account name"
								className="h-8 min-w-0 flex-1 rounded-6 bg-background px-2.5 text-xs outline-none"
							/>
							<span className="flex h-8 w-28 items-center gap-1 rounded-6 bg-background px-2.5 text-xs">
								<span className="text-fg-muted">$</span>
								<input
									value={fund}
									onChange={(e) => setFund(e.target.value)}
									inputMode="decimal"
									aria-label="Amount from Main account"
									className="w-full bg-transparent tabular-nums outline-none"
								/>
							</span>
						</div>
					)}
				</Option>
				<Option
					on={target === "main"}
					onClick={() => setTarget("main")}
					title={`${main.name} (${usd(main.balance, 0)})`}
					detail="The bot manages every position in this account. Manual trading pauses."
				/>
			</div>
			<span className="text-xs text-fg-muted">
				{target === "new"
					? `You sign two actions: create the sub-account, then move ${usd(Number(fund) || 0)} from ${main.name}.`
					: "One signature to start the bot."}
			</span>
			<button
				type="button"
				onClick={start}
				className="mt-auto h-10 shrink-0 rounded-8 bg-fill text-sm font-medium text-fg-inverse hover:opacity-90"
			>
				{target === "new" ? "Create and start bot" : "Start bot"}
			</button>
		</div>
	);
}

interface OptionProps {
	on: boolean;
	onClick: () => void;
	title: string;
	detail: string;
	children?: ReactNode;
}

function Option({ on, onClick, title, detail, children }: OptionProps) {
	return (
		<div className={cn("flex flex-col gap-2 rounded-8 px-3 py-2.5", on ? "bg-control-hover" : "bg-control")}>
			<button type="button" onClick={onClick} className="flex items-start gap-2.5 text-left">
				<span
					className={cn(
						"mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
						on ? "bg-fill text-fg-inverse" : "bg-background",
					)}
				>
					{on && <CheckIcon weight="bold" className="size-2.5" />}
				</span>
				<span className="flex flex-col gap-0.5">
					<span className="text-xs font-medium">{title}</span>
					<span className="text-xs text-fg-muted">{detail}</span>
				</span>
			</button>
			{children}
		</div>
	);
}

function Running({ api, id, onReset }: { api: AccountsApi; id: string; onReset: () => void }) {
	const acct = api.accounts.find((a) => a.id === id);
	const [on, setOn] = useState(true);
	if (!acct) return null;
	return (
		<div className={cn("flex flex-col gap-4 px-3 pt-4 pb-3", ENTER)}>
			<div className="flex items-center gap-3 rounded-12 bg-control p-4">
				<span
					className={cn(
						"grid size-9 shrink-0 place-items-center rounded-full",
						on ? "bg-success-soft text-market-up" : "bg-control-hover text-fg-muted",
					)}
				>
					{on ? <PlayIcon weight="fill" className="size-4" /> : <PauseIcon weight="fill" className="size-4" />}
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-medium">{on ? "Copying" : "Paused"}</span>
					<span className="truncate text-xs text-fg-muted">
						{TRADER.name} in {acct.name}
					</span>
				</span>
				<button
					type="button"
					onClick={() => setOn((o) => !o)}
					className={cn(
						"h-8 shrink-0 rounded-full px-3.5 text-xs font-medium",
						on ? "bg-control-hover text-fg" : "bg-fill text-fg-inverse",
					)}
				>
					{on ? "Pause" : "Start"}
				</button>
			</div>
			<span className="text-xs text-fg-muted tabular-nums">
				{usd(acct.balance)} in {acct.name}. Your other accounts keep their own mode.
			</span>
			<button type="button" onClick={onReset} className="self-start text-xs text-fg-muted hover:text-fg">
				Set up another bot
			</button>
		</div>
	);
}

function AccountsPanel({ api }: { api: AccountsApi }) {
	const [dir, setDir] = useState<"in" | "out" | null>(null);
	const [amount, setAmount] = useState("");
	const main = api.accounts[0];
	const sub = api.active.master ? null : api.active;
	function submit() {
		if (!sub || !dir) return;
		const ok =
			dir === "in" ? api.transfer(main.id, sub.id, Number(amount)) : api.transfer(sub.id, main.id, Number(amount));
		if (ok) {
			setAmount("");
			setDir(null);
		}
	}
	return (
		<div className="absolute top-[660px] right-1 flex h-[210px] w-[345px] flex-col gap-1 rounded-8 bg-surface px-2 pt-3 pb-2">
			<span className="px-1 pb-1 text-2xs tracking-micro text-fg-muted uppercase">Accounts</span>
			<div className="flex min-h-0 flex-1 flex-col overflow-auto">
				{api.accounts.map((a) => (
					<button
						key={a.id}
						type="button"
						onClick={() => api.switchTo(a.id)}
						className={cn(
							"flex h-7 shrink-0 items-center gap-2 rounded-6 px-1.5 text-xs hover:bg-control",
							a.id === api.activeId && "bg-control",
						)}
					>
						<span
							className={cn("size-1.5 rounded-full", a.mode.kind === "manual" ? "bg-fg-disabled" : "bg-market-up")}
						/>
						<span className="w-20 truncate text-left">{a.name}</span>
						<span className="flex-1 truncate text-left text-fg-muted">{modeLabel(a.mode)}</span>
						<span className="tabular-nums">{usd(a.balance, 0)}</span>
					</button>
				))}
			</div>
			{!sub && <span className="px-1.5 text-xs text-fg-muted">Pick a sub-account to move funds.</span>}
			{sub &&
				(dir ? (
					<div className={cn("flex gap-1.5", ENTER)}>
						<span className="flex h-7 flex-1 items-center gap-1 rounded-6 bg-control px-2 text-xs">
							<span className="text-fg-muted">$</span>
							<input
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								inputMode="decimal"
								placeholder={dir === "in" ? `From ${main.name}` : `To ${main.name}`}
								className="w-full bg-transparent tabular-nums outline-none"
							/>
						</span>
						<button
							type="button"
							onClick={submit}
							className="h-7 rounded-6 bg-fill px-3 text-xs font-medium text-fg-inverse"
						>
							Move
						</button>
						<button type="button" onClick={() => setDir(null)} className="h-7 rounded-6 bg-control px-2.5 text-xs">
							Cancel
						</button>
					</div>
				) : (
					<div className="flex gap-1.5">
						<button
							type="button"
							onClick={() => setDir("in")}
							className="h-7 flex-1 rounded-6 bg-control text-xs hover:bg-control-hover"
						>
							Add from Main
						</button>
						<button
							type="button"
							onClick={() => setDir("out")}
							className="h-7 flex-1 rounded-6 bg-control text-xs hover:bg-control-hover"
						>
							Return to Main
						</button>
					</div>
				))}
		</div>
	);
}
