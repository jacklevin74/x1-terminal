import { ArrowLeftIcon, CaretRightIcon, CheckIcon, CopyIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, short, usd, useAccounts } from "../sub-accounts/data";
import { Frame, HeaderSlot, Trigger } from "./frame";
import {
	CreateForm,
	copyAddress,
	DEEP_ID,
	ENTER,
	FooterItems,
	MENU,
	ModeLine,
	MoveForm,
	type SceneProps,
} from "./parts";

type Dir = "in" | "out" | null;

export default function V2({ scene }: SceneProps) {
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
	const [detail, setDetail] = useState<string | null>(deep ? DEEP_ID : null);
	const [creating, setCreating] = useState(false);
	const account = api.accounts.find((a) => a.id === detail);
	if (account)
		return (
			<div key={account.id} className={cn(MENU, "w-[340px] p-2", ENTER)}>
				<Detail api={api} account={account} initial={deep ? "in" : null} onBack={() => setDetail(null)} />
			</div>
		);
	return (
		<div key="list" className={cn(MENU, "w-[340px] p-2", ENTER)}>
			<div className="flex h-8 items-center justify-between pl-1">
				<span className="text-sm font-medium">Accounts</span>
				<button
					type="button"
					onClick={() => setCreating((c) => !c)}
					className="inline-flex h-7 items-center gap-1 rounded-8 bg-control px-2.5 text-xs hover:bg-control-hover"
				>
					<PlusIcon weight="bold" className="size-3" />
					New
				</button>
			</div>
			<div className="mt-1 flex flex-col gap-1">
				{creating && (
					<CreateForm api={api} onDone={() => setCreating(false)} className={cn("rounded-8 bg-control p-2", ENTER)} />
				)}
				{api.accounts.map((a) => (
					<Card
						key={a.id}
						account={a}
						active={a.id === api.activeId}
						onSelect={() => api.switchTo(a.id)}
						onOpen={() => setDetail(a.id)}
					/>
				))}
			</div>
			<div className="mt-1 flex flex-col">
				<FooterItems />
			</div>
		</div>
	);
}

interface CardProps {
	account: Account;
	active: boolean;
	onSelect: () => void;
	onOpen: () => void;
}

function Card({ account, active, onSelect, onOpen }: CardProps) {
	return (
		<div className={cn("flex items-stretch rounded-8 bg-control", active && "bg-control-hover")}>
			<button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left">
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex items-center gap-1.5 text-sm font-medium">
						{account.name}
						{active && <CheckIcon weight="bold" className="size-3.5" />}
					</span>
					<ModeLine account={account} />
				</span>
				<span className="text-sm tabular-nums">{usd(account.balance)}</span>
			</button>
			<button
				type="button"
				aria-label={`Open ${account.name}`}
				onClick={onOpen}
				className="grid w-9 shrink-0 place-items-center rounded-8 text-fg-muted hover:text-fg"
			>
				<CaretRightIcon weight="bold" className="size-3.5" />
			</button>
		</div>
	);
}

interface DetailProps {
	api: AccountsApi;
	account: Account;
	initial: Dir;
	onBack: () => void;
}

function Detail({ api, account, initial, onBack }: DetailProps) {
	const [dir, setDir] = useState<Dir>(initial);
	const main = api.accounts[0];
	const active = account.id === api.activeId;
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
				<span className="text-sm font-medium">{account.name}</span>
				{active && <span className="ml-auto pr-1 text-xs text-fg-muted">Trading now</span>}
			</div>
			<div className="mt-2 flex flex-col gap-1 rounded-8 bg-control p-3">
				<span className="text-2xs tracking-micro text-fg-muted uppercase">Balance</span>
				<span className="text-base font-medium tabular-nums">{usd(account.balance)}</span>
				<ModeLine account={account} />
			</div>
			<div className="mt-1 flex items-center justify-between rounded-8 bg-control py-1 pr-1 pl-3 text-xs">
				<span className="text-fg-muted">Address</span>
				<span className="flex items-center gap-1 tabular-nums">
					{short(account.address)}
					<button
						type="button"
						aria-label="Copy address"
						onClick={() => copyAddress(account)}
						className="grid size-7 place-items-center rounded-6 text-fg-muted hover:bg-control-hover hover:text-fg"
					>
						<CopyIcon className="size-3.5" />
					</button>
				</span>
			</div>
			{!account.master && (
				<div className="mt-2 grid grid-cols-2 gap-1">
					<Choice label="Add from Main" on={dir === "in"} onClick={() => setDir(dir === "in" ? null : "in")} />
					<Choice label="Return to Main" on={dir === "out"} onClick={() => setDir(dir === "out" ? null : "out")} />
				</div>
			)}
			{dir && !account.master && (
				<MoveForm
					key={dir}
					api={api}
					fromId={dir === "in" ? main.id : account.id}
					toId={dir === "in" ? account.id : main.id}
					field="bg-control"
					className={cn("mt-2", ENTER)}
				/>
			)}
			{!active && (
				<button
					type="button"
					onClick={() => api.switchTo(account.id)}
					className="mt-3 h-9 rounded-8 bg-control text-xs font-medium hover:bg-control-hover"
				>
					Trade as {account.name}
				</button>
			)}
		</>
	);
}

function Choice({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			aria-pressed={on}
			onClick={onClick}
			className={cn("h-9 rounded-8 bg-control text-xs hover:bg-control-hover", on && "bg-control-hover font-medium")}
		>
			{label}
		</button>
	);
}
