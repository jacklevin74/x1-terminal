import { ArrowLeftIcon, CaretRightIcon, CheckIcon, CopyIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, short, usd, useAccounts } from "../sub-accounts/data";
import { Frame, HeaderSlot, Trigger } from "../sub-accounts-2/frame";
import {
	CreateForm,
	copyAddress,
	DEEP_ID,
	Divider,
	ENTER,
	FooterItems,
	Item,
	MENU,
	ModeLine,
	MoveForm,
} from "../sub-accounts-2/parts";

export type Scene = "default" | "detail" | "transfer";
type Dir = "in" | "out" | null;

export default function V1({ scene }: { scene: Scene }) {
	const api = useAccounts();
	const [open, setOpen] = useState(true);
	return (
		<Frame>
			<HeaderSlot>
				<Trigger active={api.active} open={open} onClick={() => setOpen((o) => !o)} />
			</HeaderSlot>
			{open && <Menu api={api} scene={scene} />}
		</Frame>
	);
}

function Menu({ api, scene }: { api: AccountsApi; scene: Scene }) {
	const [detail, setDetail] = useState<string | null>(scene === "default" ? null : DEEP_ID);
	const [creating, setCreating] = useState(false);
	const account = api.accounts.find((a) => a.id === detail);
	const total = api.accounts.reduce((sum, a) => sum + a.balance, 0);
	if (account)
		return (
			<div key={account.id} className={cn(MENU, "w-[300px] p-2", ENTER)}>
				<Detail
					api={api}
					account={account}
					initial={scene === "transfer" ? "in" : null}
					onBack={() => setDetail(null)}
				/>
			</div>
		);
	return (
		<div key="list" className={cn(MENU, "w-[300px] p-1", ENTER)}>
			<div className="flex flex-col gap-0.5 px-2 pt-2 pb-2">
				<span className="text-2xs tracking-micro text-fg-muted uppercase">All accounts</span>
				<span className="text-base font-medium tabular-nums">{usd(total)}</span>
			</div>
			{api.accounts.map((a) => (
				<div
					key={a.id}
					className={cn("flex items-stretch rounded-8 hover:bg-control", a.id === api.activeId && "bg-control")}
				>
					<button
						type="button"
						onClick={() => api.switchTo(a.id)}
						className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2 text-left"
					>
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="flex items-center gap-1.5 text-xs font-medium">
								{a.name}
								{a.id === api.activeId && <CheckIcon weight="bold" className="size-3" />}
							</span>
							<ModeLine account={a} />
						</span>
						<span className="text-xs tabular-nums">{usd(a.balance)}</span>
					</button>
					<button
						type="button"
						aria-label={`Open ${a.name}`}
						onClick={() => setDetail(a.id)}
						className="grid w-8 shrink-0 place-items-center rounded-8 text-fg-muted hover:text-fg"
					>
						<CaretRightIcon weight="bold" className="size-3" />
					</button>
				</div>
			))}
			<Divider />
			<Item icon={<PlusIcon className="size-4" />} label="New sub-account" onClick={() => setCreating((c) => !c)} />
			{creating && (
				<CreateForm
					api={api}
					onDone={() => setCreating(false)}
					className={cn("mx-1 mb-1 rounded-8 bg-control p-2", ENTER)}
				/>
			)}
			<FooterItems />
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
