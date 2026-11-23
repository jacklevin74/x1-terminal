import {
	CaretDownIcon,
	CheckIcon,
	HandPointingIcon,
	PlusIcon,
	RobotIcon,
	TrendDownIcon,
	TrendUpIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, modeLabel, usd, useAccounts } from "../sub-accounts/data";
import { Frame, HeaderSlot, Trigger } from "./frame";
import { CreateForm, copyAddress, DEEP_ID, ENTER, FooterItems, MENU, MoveForm, type SceneProps } from "./parts";

type Action = "in" | "out" | null;

export default function V4({ scene }: SceneProps) {
	const api = useAccounts();
	const [open, setOpen] = useState(true);
	return (
		<Frame>
			<HeaderSlot>
				<Trigger active={api.active} open={open} onClick={() => setOpen((o) => !o)} />
			</HeaderSlot>
			{open && <Menu api={api} deep={scene === "transfer"} />}
		</Frame>
	);
}

function Menu({ api, deep }: { api: AccountsApi; deep: boolean }) {
	const [expanded, setExpanded] = useState<string | null>(deep ? DEEP_ID : null);
	const [creating, setCreating] = useState(false);
	const [main, ...subs] = api.accounts;
	function row(a: Account) {
		return (
			<Row
				key={a.id}
				api={api}
				account={a}
				open={expanded === a.id}
				initial={deep && a.id === DEEP_ID ? "in" : null}
				onToggle={() => setExpanded((e) => (e === a.id ? null : a.id))}
			/>
		);
	}
	return (
		<div className={cn(MENU, "w-[360px] p-1.5", ENTER)}>
			<span className="px-2 pt-1.5 pb-1 text-2xs tracking-micro text-fg-muted uppercase">Main</span>
			<div className="rounded-12 bg-surface p-1">{row(main)}</div>
			<div className="flex items-center justify-between pt-2 pr-1 pb-1 pl-2">
				<span className="text-2xs tracking-micro text-fg-muted uppercase">Sub-accounts ({subs.length})</span>
				<button
					type="button"
					onClick={() => setCreating((c) => !c)}
					className="inline-flex h-6 items-center gap-1 rounded-full bg-control px-2.5 text-xs hover:bg-control-hover"
				>
					<PlusIcon weight="bold" className="size-3" />
					New
				</button>
			</div>
			<div className="flex flex-col rounded-12 bg-surface p-1">
				{creating && (
					<CreateForm api={api} onDone={() => setCreating(false)} field="bg-control" className={cn("p-2", ENTER)} />
				)}
				{subs.map(row)}
			</div>
			<div className="mt-1 flex flex-col">
				<FooterItems />
			</div>
		</div>
	);
}

function ModeTile({ account }: { account: Account }) {
	const { mode } = account;
	const tile = "grid size-8 shrink-0 place-items-center rounded-8 bg-control";
	if (mode.kind === "basket")
		return (
			<span className={tile}>
				<RobotIcon className="size-4 text-fg-secondary" />
			</span>
		);
	if (mode.kind === "copy" && mode.bias === "bullish")
		return (
			<span className={tile}>
				<TrendUpIcon weight="bold" className="size-4 text-market-up" />
			</span>
		);
	if (mode.kind === "copy")
		return (
			<span className={tile}>
				<TrendDownIcon weight="bold" className="size-4 text-market-down" />
			</span>
		);
	return (
		<span className={tile}>
			<HandPointingIcon className="size-4 text-fg-secondary" />
		</span>
	);
}

interface RowProps {
	api: AccountsApi;
	account: Account;
	open: boolean;
	initial: Action;
	onToggle: () => void;
}

function Row({ api, account, open, initial, onToggle }: RowProps) {
	const [action, setAction] = useState<Action>(initial);
	const active = account.id === api.activeId;
	const main = api.accounts[0];
	return (
		<div className="flex flex-col">
			<div className="flex items-center rounded-8 hover:bg-control">
				<button
					type="button"
					onClick={() => api.switchTo(account.id)}
					className="flex min-w-0 flex-1 items-center gap-2.5 py-1.5 pl-1.5 text-left"
				>
					<ModeTile account={account} />
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="flex items-center gap-1.5 text-xs font-medium">
							{account.name}
							{active && <CheckIcon weight="bold" className="size-3" />}
						</span>
						<span className="truncate text-xs text-fg-muted">{modeLabel(account.mode)}</span>
					</span>
					<span className="text-xs tabular-nums">{usd(account.balance)}</span>
				</button>
				<button
					type="button"
					aria-label={`Actions for ${account.name}`}
					aria-expanded={open}
					onClick={onToggle}
					className="mx-1 grid size-7 shrink-0 place-items-center rounded-8 text-fg-muted hover:bg-control-hover hover:text-fg"
				>
					<CaretDownIcon weight="bold" className={cn("size-3 transition-transform", open && "rotate-180")} />
				</button>
			</div>
			{open && (
				<div className={cn("flex flex-col gap-2 px-1.5 pt-1 pb-2", ENTER)}>
					<div className="flex flex-wrap gap-1">
						{!account.master && (
							<>
								<Chip
									label="Add from Main"
									on={action === "in"}
									onClick={() => setAction(action === "in" ? null : "in")}
								/>
								<Chip
									label="Return to Main"
									on={action === "out"}
									onClick={() => setAction(action === "out" ? null : "out")}
								/>
							</>
						)}
						<Chip label="Copy address" on={false} onClick={() => copyAddress(account)} />
					</div>
					{action && !account.master && (
						<MoveForm
							key={action}
							api={api}
							fromId={action === "in" ? main.id : account.id}
							toId={action === "in" ? account.id : main.id}
							field="bg-control"
							className={ENTER}
						/>
					)}
				</div>
			)}
		</div>
	);
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			aria-pressed={on}
			onClick={onClick}
			className={cn(
				"h-7 rounded-full px-2.5 text-xs tabular-nums",
				on ? "bg-fill font-medium text-fg-inverse" : "bg-control hover:bg-control-hover",
			)}
		>
			{label}
		</button>
	);
}
