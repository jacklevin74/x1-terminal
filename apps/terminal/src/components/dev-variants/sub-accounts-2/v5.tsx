import { CaretRightIcon, CheckIcon, CopyIcon, UsersThreeIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, short, usd, useAccounts } from "../sub-accounts/data";
import { Frame, HeaderSlot, Trigger } from "./frame";
import {
	CreateForm,
	copyAddress,
	DEEP_ID,
	Direction,
	Divider,
	ENTER,
	FooterItems,
	Item,
	MENU,
	ModeLine,
	MoveForm,
	type SceneProps,
} from "./parts";

export default function V5({ scene }: SceneProps) {
	const api = useAccounts();
	const deep = scene === "transfer";
	const [open, setOpen] = useState(!deep);
	const [managing, setManaging] = useState(deep);
	return (
		<Frame>
			<HeaderSlot>
				<Trigger active={api.active} open={open} onClick={() => setOpen((o) => !o)} />
			</HeaderSlot>
			{open && (
				<Menu
					api={api}
					onManage={() => {
						setOpen(false);
						setManaging(true);
					}}
				/>
			)}
			{managing && <Manage api={api} initial={deep ? DEEP_ID : null} onClose={() => setManaging(false)} />}
		</Frame>
	);
}

function Menu({ api, onManage }: { api: AccountsApi; onManage: () => void }) {
	const total = api.accounts.reduce((sum, a) => sum + a.balance, 0);
	return (
		<div className={cn(MENU, "w-[300px] p-1", ENTER)}>
			<div className="flex flex-col gap-0.5 px-2 pt-2 pb-2">
				<span className="text-2xs tracking-micro text-fg-muted uppercase">All accounts</span>
				<span className="text-base font-medium tabular-nums">{usd(total)}</span>
			</div>
			{api.accounts.map((a) => (
				<button
					key={a.id}
					type="button"
					onClick={() => api.switchTo(a.id)}
					className={cn(
						"flex items-center gap-2 rounded-8 px-2 py-1.5 text-left hover:bg-control",
						a.id === api.activeId && "bg-control",
					)}
				>
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="text-xs font-medium">{a.name}</span>
						<ModeLine account={a} />
					</span>
					<span className="text-xs tabular-nums">{usd(a.balance)}</span>
					<span className="grid size-4 place-items-center">
						{a.id === api.activeId && <CheckIcon weight="bold" className="size-3" />}
					</span>
				</button>
			))}
			<Divider />
			<Item
				icon={<UsersThreeIcon className="size-4" />}
				label="Manage accounts"
				detail={<CaretRightIcon className="size-3" />}
				onClick={onManage}
			/>
			<FooterItems />
		</div>
	);
}

interface ManageProps {
	api: AccountsApi;
	initial: string | null;
	onClose: () => void;
}

function Manage({ api, initial, onClose }: ManageProps) {
	const [moving, setMoving] = useState<string | null>(initial);
	return (
		<div className="absolute inset-0 z-50 grid place-items-center bg-scrim p-6">
			<div
				className={cn("flex max-h-full w-[480px] flex-col overflow-y-auto rounded-16 bg-overlay shadow-menu", ENTER)}
			>
				<div className="flex items-center justify-between py-3 pr-3 pl-4">
					<h2 className="text-base font-medium">Manage accounts</h2>
					<button
						type="button"
						aria-label="Close"
						onClick={onClose}
						className="grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-control hover:text-fg"
					>
						<XIcon weight="bold" className="size-4" />
					</button>
				</div>
				<div className="flex flex-col gap-1 px-4">
					{api.accounts.map((a) => (
						<Row
							key={a.id}
							api={api}
							account={a}
							moving={moving === a.id}
							onMove={() => setMoving((m) => (m === a.id ? null : a.id))}
						/>
					))}
				</div>
				<div className="flex flex-col gap-2 p-4">
					<span className="text-2xs tracking-micro text-fg-muted uppercase">New sub-account</span>
					<CreateForm api={api} field="bg-control" quiet />
				</div>
			</div>
		</div>
	);
}

interface RowProps {
	api: AccountsApi;
	account: Account;
	moving: boolean;
	onMove: () => void;
}

function Row({ api, account, moving, onMove }: RowProps) {
	const [toSub, setToSub] = useState(true);
	const main = api.accounts[0];
	const active = account.id === api.activeId;
	return (
		<div className="flex flex-col rounded-12 bg-control">
			<div className="flex items-center gap-3 py-2.5 pr-2.5 pl-3">
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex items-center gap-1.5 text-sm font-medium">
						{account.name}
						{active && <CheckIcon weight="bold" className="size-3.5" />}
					</span>
					<span className="flex items-center gap-1 text-xs text-fg-muted tabular-nums">
						{short(account.address)}
						<button
							type="button"
							aria-label={`Copy ${account.name} address`}
							onClick={() => copyAddress(account)}
							className="grid size-5 place-items-center rounded-4 hover:bg-control-hover hover:text-fg"
						>
							<CopyIcon className="size-3" />
						</button>
					</span>
				</span>
				<span className="flex flex-col items-end gap-0.5">
					<span className="text-sm tabular-nums">{usd(account.balance)}</span>
					<ModeLine account={account} />
				</span>
				{account.master ? (
					<span className="w-[92px]" />
				) : (
					<button
						type="button"
						aria-pressed={moving}
						onClick={onMove}
						className={cn(
							"h-8 w-[92px] rounded-8 bg-control-hover text-xs hover:text-fg",
							moving && "bg-background font-medium",
						)}
					>
						Move funds
					</button>
				)}
			</div>
			{moving && !account.master && (
				<div className={cn("flex flex-col gap-2 px-3 pb-3", ENTER)}>
					<Direction name={account.name} toSub={toSub} onChange={setToSub} />
					<MoveForm
						key={String(toSub)}
						api={api}
						fromId={toSub ? main.id : account.id}
						toId={toSub ? account.id : main.id}
					/>
				</div>
			)}
		</div>
	);
}
