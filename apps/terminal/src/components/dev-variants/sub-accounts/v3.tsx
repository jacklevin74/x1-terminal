import { ArrowsDownUpIcon, CaretDownIcon, CheckIcon, PlusIcon, RobotIcon, XIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { AutoIconStack } from "@/components/trade/auto/auto-icon-stack";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, modeLabel, short, usd, useAccounts } from "./data";
import { Frame, HeaderSlot, WalletTrigger } from "./frame";

const ENTER = "transition-[opacity,scale] duration-150 starting:scale-[0.97] starting:opacity-0";

type Dialog = "create" | "move" | null;

export default function V3() {
	const api = useAccounts("s1");
	const [open, setOpen] = useState(true);
	const [dialog, setDialog] = useState<Dialog>(null);
	const running = api.active.mode.kind !== "manual";
	function openDialog(d: Dialog) {
		setOpen(false);
		setDialog(d);
	}
	return (
		<Frame account={api.active}>
			<HeaderSlot>
				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					className={cn(
						"inline-flex h-8 items-center gap-2 rounded-8 bg-control pr-3 pl-1.5 text-xs hover:bg-control-hover",
						open && "bg-control-hover",
					)}
				>
					<span className="relative grid size-6 place-items-center rounded-6 bg-control-hover text-2xs font-medium">
						{api.active.name[0]}
						{running && (
							<span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-market-up ring-2 ring-control" />
						)}
					</span>
					<span className="font-medium">{api.active.name}</span>
					<span className="text-fg-muted tabular-nums">{usd(api.active.balance, 0)}</span>
					<CaretDownIcon
						weight="bold"
						className={cn("size-3 text-fg-muted transition-transform", open && "rotate-180")}
					/>
				</button>
				<WalletTrigger active={{ ...api.accounts[0] }} />
			</HeaderSlot>
			{open && <Switcher api={api} onPick={() => setOpen(false)} onDialog={openDialog} />}
			{dialog && (
				<div className="absolute inset-0 z-40 grid place-items-center bg-scrim">
					<div className={cn("flex w-[400px] flex-col gap-4 rounded-12 bg-overlay p-5 shadow-menu", ENTER)}>
						<div className="flex items-center justify-between">
							<span className="text-base font-medium">{dialog === "create" ? "New sub-account" : "Move funds"}</span>
							<button
								type="button"
								aria-label="Close"
								onClick={() => setDialog(null)}
								className="grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-control-hover hover:text-fg"
							>
								<XIcon className="size-4" />
							</button>
						</div>
						{dialog === "create" ? (
							<CreateForm api={api} onDone={() => setDialog(null)} />
						) : (
							<MoveForm api={api} onDone={() => setDialog(null)} />
						)}
					</div>
				</div>
			)}
		</Frame>
	);
}

interface SwitcherProps {
	api: AccountsApi;
	onPick: () => void;
	onDialog: (d: Dialog) => void;
}

function Switcher({ api, onPick, onDialog }: SwitcherProps) {
	const bots = api.accounts.filter((a) => a.mode.kind !== "manual");
	const manual = api.accounts.filter((a) => a.mode.kind === "manual");
	function pick(id: string) {
		api.switchTo(id);
		onPick();
	}
	return (
		<div
			className={cn(
				"absolute top-11 right-[200px] z-40 flex w-[360px] origin-top flex-col rounded-12 bg-overlay p-1 shadow-menu",
				ENTER,
			)}
		>
			<Group label="Running a bot" count={bots.length}>
				{bots.map((a) => (
					<Row key={a.id} account={a} active={a.id === api.activeId} onClick={() => pick(a.id)} />
				))}
			</Group>
			<Group label="Manual" count={manual.length}>
				{manual.map((a) => (
					<Row key={a.id} account={a} active={a.id === api.activeId} onClick={() => pick(a.id)} />
				))}
			</Group>
			<div className="my-1 h-px bg-stroke-weak" />
			<div className="flex gap-1 p-1">
				<button
					type="button"
					onClick={() => onDialog("create")}
					className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-8 bg-control text-xs hover:bg-control-hover"
				>
					<PlusIcon weight="bold" className="size-3" />
					New sub-account
				</button>
				<button
					type="button"
					onClick={() => onDialog("move")}
					className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-8 bg-control text-xs hover:bg-control-hover"
				>
					<ArrowsDownUpIcon className="size-3.5" />
					Move funds
				</button>
			</div>
		</div>
	);
}

function Group({ label, count, children }: { label: string; count: number; children: ReactNode }) {
	return (
		<div className="flex flex-col">
			<span className="flex h-7 items-center gap-2 px-2 text-2xs tracking-micro text-fg-muted uppercase">
				{label}
				<span className="tabular-nums">{count}</span>
			</span>
			{children}
		</div>
	);
}

function Row({ account, active, onClick }: { account: Account; active: boolean; onClick: () => void }) {
	const { mode } = account;
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn("flex items-center gap-3 rounded-8 px-2 py-2 text-left hover:bg-control", active && "bg-control")}
		>
			<span className="grid size-8 shrink-0 place-items-center rounded-8 bg-control-hover text-xs font-medium">
				{mode.kind === "basket" ? <AutoIconStack coins={mode.markets} max={1} size="size-5" /> : account.name[0]}
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="flex items-center gap-1.5 text-xs font-medium">
					{account.name}
					{active && <CheckIcon weight="bold" className="size-3" />}
				</span>
				<span className="flex items-center gap-1 truncate text-xs text-fg-muted">
					{mode.kind !== "manual" && <RobotIcon className="size-3" />}
					{account.master ? `Master ${short(account.address)}` : modeLabel(mode)}
				</span>
			</span>
			<span className="text-xs tabular-nums">{usd(account.balance)}</span>
		</button>
	);
}

function CreateForm({ api, onDone }: { api: AccountsApi; onDone: () => void }) {
	const [name, setName] = useState("");
	const [switchAfter, setSwitchAfter] = useState(true);
	function submit() {
		if (api.create(name, { select: switchAfter })) onDone();
	}
	return (
		<>
			<label className="flex flex-col gap-1.5 text-xs text-fg-muted">
				Name
				<input
					maxLength={16}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g. SOL scalps"
					className="h-10 rounded-8 bg-control px-3 text-sm text-fg outline-none"
				/>
			</label>
			<button
				type="button"
				onClick={() => setSwitchAfter((s) => !s)}
				className="flex items-center gap-2 text-left text-xs text-fg-secondary"
			>
				<span
					className={cn(
						"grid size-4 place-items-center rounded-4",
						switchAfter ? "bg-fill text-fg-inverse" : "bg-control-hover",
					)}
				>
					{switchAfter && <CheckIcon weight="bold" className="size-3" />}
				</span>
				Switch to it after creating
			</button>
			<span className="text-xs text-fg-muted">
				Signed by your main wallet. No funds move. Hyperliquid unlocks sub-accounts after $100,000 in trading volume.
			</span>
			<button
				type="button"
				onClick={submit}
				className="h-11 rounded-8 bg-fill text-sm font-medium text-fg-inverse hover:opacity-90"
			>
				Create sub-account
			</button>
		</>
	);
}

function MoveForm({ api, onDone }: { api: AccountsApi; onDone: () => void }) {
	const subs = api.accounts.filter((a) => !a.master);
	const [subId, setSubId] = useState(api.active.master ? subs[0].id : api.activeId);
	const [toSub, setToSub] = useState(true);
	const [amount, setAmount] = useState("");
	const main = api.accounts[0];
	const sub = subs.find((s) => s.id === subId) ?? subs[0];
	const from = toSub ? main : sub;
	const to = toSub ? sub : main;
	function submit() {
		if (api.transfer(from.id, to.id, Number(amount))) onDone();
	}
	return (
		<>
			<div className="flex flex-wrap gap-1.5">
				{subs.map((s) => (
					<button
						key={s.id}
						type="button"
						onClick={() => setSubId(s.id)}
						className={cn(
							"h-8 rounded-full px-3 text-xs",
							s.id === subId ? "bg-fill text-fg-inverse" : "bg-control hover:bg-control-hover",
						)}
					>
						{s.name}
					</button>
				))}
			</div>
			<div className="flex flex-col rounded-8 bg-control">
				<Side label="From" account={from} />
				<div className="relative h-px bg-stroke-weak">
					<button
						type="button"
						aria-label="Swap direction"
						onClick={() => setToSub((t) => !t)}
						className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-control-hover hover:bg-fill-hover"
					>
						<ArrowsDownUpIcon className="size-4" />
					</button>
				</div>
				<Side label="To" account={to} />
			</div>
			<span className="flex h-10 items-center gap-1 rounded-8 bg-control px-3 text-sm">
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
					onClick={() => setAmount(String(from.balance))}
					className="text-xs text-fg-muted hover:text-fg"
				>
					Max
				</button>
			</span>
			<button
				type="button"
				onClick={submit}
				className="h-11 rounded-8 bg-fill text-sm font-medium text-fg-inverse hover:opacity-90"
			>
				Move USDC
			</button>
		</>
	);
}

function Side({ label, account }: { label: string; account: Account }) {
	return (
		<div className="flex items-center gap-3 px-3 py-3">
			<span className="w-9 text-xs text-fg-muted">{label}</span>
			<span className="flex-1 text-sm">{account.name}</span>
			<span className="pr-12 text-xs text-fg-muted tabular-nums">{usd(account.balance)}</span>
		</div>
	);
}
