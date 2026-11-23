import { ArrowsLeftRightIcon, CheckIcon, CopyIcon, DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
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
	MENU,
	ModeLine,
	MoveForm,
	type SceneProps,
} from "./parts";

export default function V1({ scene }: SceneProps) {
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
	const [moving, setMoving] = useState<string | null>(deep ? DEEP_ID : null);
	const [menuFor, setMenuFor] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	return (
		<div className={cn(MENU, "w-[340px] p-1", ENTER)}>
			<div className="flex items-center gap-3 px-2 pt-1.5 pb-1">
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm font-medium">{api.active.name}</span>
					<span className="text-xs text-fg-muted tabular-nums">{short(api.active.address)}</span>
				</span>
				<button
					type="button"
					aria-label="Copy address"
					onClick={() => copyAddress(api.active)}
					className="grid size-8 place-items-center rounded-8 text-fg-muted hover:bg-control-hover hover:text-fg"
				>
					<CopyIcon className="size-4" />
				</button>
			</div>
			<Divider />
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
			{creating && (
				<CreateForm
					api={api}
					onDone={() => setCreating(false)}
					className={cn("mx-1 mb-1 rounded-8 bg-control p-2", ENTER)}
				/>
			)}
			{api.accounts.map((a) => (
				<div key={a.id} className="relative flex flex-col">
					<Row
						account={a}
						active={a.id === api.activeId}
						menuOpen={menuFor === a.id}
						onSelect={() => api.switchTo(a.id)}
						onMenu={() => setMenuFor((m) => (m === a.id ? null : a.id))}
					/>
					{menuFor === a.id && (
						<RowMenu
							account={a}
							onMove={() => {
								setMoving(a.id);
								setMenuFor(null);
							}}
							onCopy={() => {
								copyAddress(a);
								setMenuFor(null);
							}}
						/>
					)}
					{moving === a.id && !a.master && <MoveRow api={api} account={a} />}
				</div>
			))}
			<FooterItems />
		</div>
	);
}

interface RowProps {
	account: Account;
	active: boolean;
	menuOpen: boolean;
	onSelect: () => void;
	onMenu: () => void;
}

function Row({ account, active, menuOpen, onSelect, onMenu }: RowProps) {
	return (
		<div className="flex items-center gap-1 rounded-8 hover:bg-control">
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
			<button
				type="button"
				aria-label={`More for ${account.name}`}
				aria-expanded={menuOpen}
				onClick={onMenu}
				className={cn(
					"mr-1 grid size-7 shrink-0 place-items-center rounded-8 text-fg-muted hover:bg-control-hover hover:text-fg",
					menuOpen && "bg-control-hover text-fg",
				)}
			>
				<DotsThreeIcon weight="bold" className="size-4" />
			</button>
		</div>
	);
}

function RowMenu({ account, onMove, onCopy }: { account: Account; onMove: () => void; onCopy: () => void }) {
	return (
		<div
			className={cn(
				"absolute top-10 right-1 z-10 flex w-40 origin-top-right flex-col rounded-8 bg-control p-1 shadow-menu",
				ENTER,
			)}
		>
			{!account.master && (
				<button
					type="button"
					onClick={onMove}
					className="flex h-7 items-center gap-2 rounded-6 px-2 text-xs hover:bg-control-hover"
				>
					<ArrowsLeftRightIcon className="size-3.5 text-fg-muted" />
					Move funds
				</button>
			)}
			<button
				type="button"
				onClick={onCopy}
				className="flex h-7 items-center gap-2 rounded-6 px-2 text-xs hover:bg-control-hover"
			>
				<CopyIcon className="size-3.5 text-fg-muted" />
				Copy address
			</button>
		</div>
	);
}

function MoveRow({ api, account }: { api: AccountsApi; account: Account }) {
	const [toSub, setToSub] = useState(true);
	const main = api.accounts[0];
	return (
		<div className={cn("mx-1 mb-1 flex flex-col gap-2 rounded-8 bg-control p-2", ENTER)}>
			<Direction name={account.name} toSub={toSub} onChange={setToSub} />
			<MoveForm api={api} fromId={toSub ? main.id : account.id} toId={toSub ? account.id : main.id} />
		</div>
	);
}
