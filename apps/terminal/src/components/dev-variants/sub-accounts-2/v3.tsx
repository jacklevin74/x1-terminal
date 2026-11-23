import {
	ArrowLeftIcon,
	ArrowsDownUpIcon,
	ArrowsLeftRightIcon,
	CaretDownIcon,
	CaretRightIcon,
	CheckCircleIcon,
	CircleIcon,
	CopyIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, modeLabel, short, usd, useAccounts } from "../sub-accounts/data";
import { Frame, HeaderSlot, Trigger } from "./frame";
import {
	CreateForm,
	copyAddress,
	DEEP_ID,
	Divider,
	ENTER,
	FooterItems,
	Item,
	MENU,
	MoveForm,
	type SceneProps,
} from "./parts";

export default function V3({ scene }: SceneProps) {
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
	const [moving, setMoving] = useState(deep);
	const [creating, setCreating] = useState(false);
	if (moving)
		return (
			<div key="move" className={cn(MENU, "w-[320px] p-1", ENTER)}>
				<Transfer api={api} onBack={() => setMoving(false)} />
			</div>
		);
	return (
		<div key="list" className={cn(MENU, "w-[320px] p-1", ENTER)}>
			<div className="flex h-7 items-center justify-between px-2">
				<span className="text-2xs tracking-micro text-fg-muted uppercase">Trading as</span>
				<span className="text-2xs tracking-micro text-fg-muted uppercase">Balance</span>
			</div>
			{api.accounts.map((a) => (
				<Row key={a.id} account={a} active={a.id === api.activeId} onSelect={() => api.switchTo(a.id)} />
			))}
			<Divider />
			<Item
				icon={<ArrowsLeftRightIcon className="size-4" />}
				label="Move funds"
				detail={<CaretRightIcon className="size-3" />}
				onClick={() => setMoving(true)}
			/>
			<Item icon={<PlusIcon className="size-4" />} label="New sub-account" onClick={() => setCreating((c) => !c)} />
			{creating && (
				<CreateForm
					api={api}
					onDone={() => setCreating(false)}
					className={cn("mx-1 my-1 rounded-8 bg-control p-2", ENTER)}
				/>
			)}
			<FooterItems />
		</div>
	);
}

function Row({ account, active, onSelect }: { account: Account; active: boolean; onSelect: () => void }) {
	return (
		<div className="group flex h-8 items-center rounded-8 hover:bg-control">
			<button type="button" onClick={onSelect} className="flex h-full min-w-0 flex-1 items-center gap-2 pl-2 text-left">
				{active ? (
					<CheckCircleIcon weight="fill" className="size-4 shrink-0" />
				) : (
					<CircleIcon className="size-4 shrink-0 text-fg-disabled" />
				)}
				<span className={cn("shrink-0 text-xs", active && "font-medium")}>{account.name}</span>
				<span className="min-w-0 flex-1 truncate text-xs text-fg-muted">{modeLabel(account.mode)}</span>
				<span className="text-xs tabular-nums">{usd(account.balance)}</span>
			</button>
			<button
				type="button"
				aria-label={`Copy ${account.name} address`}
				onClick={() => copyAddress(account)}
				className="mx-1 grid size-6 shrink-0 place-items-center rounded-6 text-fg-muted hover:bg-control-hover hover:text-fg"
			>
				<CopyIcon className="size-3.5" />
			</button>
		</div>
	);
}

function Transfer({ api, onBack }: { api: AccountsApi; onBack: () => void }) {
	const [fromId, setFromId] = useState(api.accounts[0].id);
	const [toId, setToId] = useState(DEEP_ID);
	const [picking, setPicking] = useState<"from" | "to" | null>(null);
	const from = api.accounts.find((a) => a.id === fromId) ?? api.accounts[0];
	const to = api.accounts.find((a) => a.id === toId) ?? api.accounts[1];
	const throughMain = !from.master && !to.master;

	function pick(id: string) {
		const other = picking === "from" ? toId : fromId;
		if (id === other) swap();
		else if (picking === "from") setFromId(id);
		else setToId(id);
		setPicking(null);
	}
	function swap() {
		setFromId(toId);
		setToId(fromId);
	}

	return (
		<>
			<div className="flex h-8 items-center gap-1">
				<button
					type="button"
					aria-label="Back to accounts"
					onClick={onBack}
					className="grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-control hover:text-fg"
				>
					<ArrowLeftIcon className="size-4" />
				</button>
				<span className="text-xs font-medium">Move funds</span>
				<button
					type="button"
					onClick={swap}
					className="mr-1 ml-auto inline-flex h-6 items-center gap-1 rounded-full bg-control px-2.5 text-xs hover:bg-control-hover"
				>
					<ArrowsDownUpIcon className="size-3" />
					Swap
				</button>
			</div>
			<div className="flex flex-col gap-1 p-1">
				<Field
					label="From"
					account={from}
					open={picking === "from"}
					onClick={() => setPicking(picking === "from" ? null : "from")}
				/>
				{picking === "from" && <Options api={api} current={fromId} onPick={pick} />}
				<Field
					label="To"
					account={to}
					open={picking === "to"}
					onClick={() => setPicking(picking === "to" ? null : "to")}
				/>
				{picking === "to" && <Options api={api} current={toId} onPick={pick} />}
				<MoveForm key={`${fromId}-${toId}`} api={api} fromId={fromId} toId={toId} field="bg-control" className="mt-1" />
				{throughMain && <span className="text-xs text-fg-muted">This goes through Main account as two transfers.</span>}
			</div>
		</>
	);
}

interface FieldProps {
	label: string;
	account: Account;
	open: boolean;
	onClick: () => void;
}

function Field({ label, account, open, onClick }: FieldProps) {
	return (
		<button
			type="button"
			aria-expanded={open}
			onClick={onClick}
			className={cn(
				"flex h-10 items-center gap-2 rounded-8 bg-control px-2.5 text-left text-xs hover:bg-control-hover",
				open && "bg-control-hover",
			)}
		>
			<span className="w-9 text-fg-muted">{label}</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="font-medium">{account.name}</span>
				<span className="text-2xs text-fg-muted tabular-nums">{short(account.address)}</span>
			</span>
			<span className="tabular-nums">{usd(account.balance)}</span>
			<CaretDownIcon weight="bold" className={cn("size-3 text-fg-muted transition-transform", open && "rotate-180")} />
		</button>
	);
}

function Options({ api, current, onPick }: { api: AccountsApi; current: string; onPick: (id: string) => void }) {
	return (
		<div className={cn("flex flex-col rounded-8 bg-control p-1", ENTER)}>
			{api.accounts.map((a) => (
				<button
					key={a.id}
					type="button"
					onClick={() => onPick(a.id)}
					className={cn(
						"flex h-7 items-center justify-between rounded-6 px-2 text-xs hover:bg-control-hover",
						a.id === current && "bg-control-hover",
					)}
				>
					<span>{a.name}</span>
					<span className="text-fg-muted tabular-nums">{usd(a.balance)}</span>
				</button>
			))}
		</div>
	);
}
