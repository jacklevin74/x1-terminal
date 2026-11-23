import {
	ArrowClockwiseIcon,
	CaretDownIcon,
	CaretRightIcon,
	CheckIcon,
	DotsThreeIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useSubaccountActions } from "@/hooks/use-subaccount-actions";
import { cn } from "@/lib/cn";
import { formatUSD } from "@/lib/format";
import { AccountMenuDetail } from "./account-menu-detail";
import type { MenuAccount, MenuItem } from "./account-menu-types";
import { AccountModeLine } from "./account-mode-line";

const ENTER = "transition-[opacity,scale] duration-150 starting:scale-[0.97] starting:opacity-0";

interface Props {
	accounts: MenuAccount[];
	activeAddress: string;
	walletLabel: string;
	canManage: boolean;
	switchDisabled: boolean;
	loadError: boolean;
	more: MenuItem[];
	groups: MenuItem[][];
	onSwitch: (account: MenuAccount) => void;
	onRefresh: () => void;
	onClose: () => void;
}

export function AccountMenu({
	accounts,
	activeAddress,
	walletLabel,
	canManage,
	switchDisabled,
	loadError,
	more,
	groups,
	onSwitch,
	onRefresh,
	onClose,
}: Props) {
	const [detail, setDetail] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);
	const isActive = (a: MenuAccount) => a.address.toLowerCase() === activeAddress.toLowerCase();
	const account = accounts.find((a) => a.address === detail);
	const total =
		accounts[0].value === undefined ? undefined : accounts.reduce((sum, a) => sum + Number(a.value ?? 0), 0);

	function switchTo(a: MenuAccount) {
		onSwitch(a);
		onClose();
	}

	function closing(item: MenuItem): MenuItem {
		return {
			...item,
			onSelect: () => {
				item.onSelect();
				if (!item.keepOpen) onClose();
			},
		};
	}

	if (account)
		return (
			<div key={account.address} className={cn("flex w-[300px] flex-col p-2", ENTER)}>
				<AccountMenuDetail
					account={account}
					main={accounts[0]}
					active={isActive(account)}
					canMove={canManage}
					switchDisabled={switchDisabled}
					onBack={() => setDetail(null)}
					onSwitch={() => switchTo(account)}
					onMoved={onRefresh}
				/>
			</div>
		);

	return (
		<div key="list" className={cn("flex w-[300px] flex-col p-1", ENTER)}>
			<div className="flex flex-col gap-0.5 px-2 pt-2 pb-2">
				<span className="flex items-baseline justify-between gap-2 text-2xs tracking-micro text-fg-muted uppercase">
					All accounts
					<span className="truncate tracking-normal normal-case">{walletLabel}</span>
				</span>
				<span className="text-base font-medium tabular-nums">{formatUSD(total, { compact: false })}</span>
			</div>
			{accounts.map((a) => (
				<div
					key={a.address}
					className={cn("flex items-stretch rounded-8 hover:bg-control", isActive(a) && "bg-control")}
				>
					<button
						type="button"
						disabled={switchDisabled}
						onClick={() => switchTo(a)}
						className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2 text-left disabled:text-fg-disabled"
					>
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="flex items-center gap-1.5 text-xs font-medium">
								<span className="truncate">{a.name}</span>
								{isActive(a) && <CheckIcon weight="bold" className="size-3 shrink-0" />}
							</span>
							<AccountModeLine address={a.address} />
						</span>
						<span className="text-xs tabular-nums">{formatUSD(a.value, { compact: false })}</span>
					</button>
					<button
						type="button"
						aria-label={`Open ${a.name}`}
						onClick={() => setDetail(a.address)}
						className="grid w-8 shrink-0 place-items-center rounded-8 text-fg-muted hover:text-fg"
					>
						<CaretRightIcon weight="bold" className="size-3" />
					</button>
				</div>
			))}
			{loadError && (
				<Item
					item={{
						label: "Retry loading sub-accounts",
						icon: <ArrowClockwiseIcon className="size-4" />,
						onSelect: onRefresh,
					}}
				/>
			)}
			{canManage && (
				<>
					<Divider />
					<Item
						item={{
							label: "New sub-account",
							icon: <PlusIcon className="size-4" />,
							onSelect: () => setCreating((c) => !c),
						}}
					/>
					{creating && (
						<CreateForm
							onDone={() => {
								setCreating(false);
								onRefresh();
							}}
						/>
					)}
				</>
			)}
			<Divider />
			<button
				type="button"
				aria-expanded={moreOpen}
				onClick={() => setMoreOpen((o) => !o)}
				className="flex h-7 items-center gap-2 rounded-8 px-2 text-left text-xs hover:bg-control max-md:h-8"
			>
				<span className="text-fg-muted">
					<DotsThreeIcon weight="bold" className="size-4" />
				</span>
				More
				<CaretDownIcon
					weight="bold"
					className={cn("ml-auto size-3 text-fg-muted transition-transform duration-150", moreOpen && "rotate-180")}
				/>
			</button>
			{moreOpen && (
				<div className={cn("flex flex-col", ENTER)}>
					{more.map((item) => (
						<Item key={item.label} item={closing(item)} />
					))}
				</div>
			)}
			{groups.map((group) => (
				<div key={group.map((item) => item.label).join("|")} className="flex flex-col">
					<Divider />
					{group.map((item) => (
						<Item key={item.label} item={closing(item)} />
					))}
				</div>
			))}
		</div>
	);
}

function Divider() {
	return <div className="my-1 h-px flex-none bg-stroke-weak" />;
}

function Item({ item }: { item: MenuItem }) {
	return (
		<button
			type="button"
			onClick={item.onSelect}
			className="flex h-7 items-center gap-2 rounded-8 px-2 text-left text-xs hover:bg-control max-md:h-8"
		>
			<span className="text-fg-muted">{item.icon}</span>
			{item.label}
			{item.detail && <span className="ml-auto text-fg-muted tabular-nums">{item.detail}</span>}
		</button>
	);
}

function CreateForm({ onDone }: { onDone: () => void }) {
	const [name, setName] = useState("");
	const actions = useSubaccountActions();
	async function submit() {
		if (!(await actions.create(name))) return;
		setName("");
		onDone();
	}
	return (
		<div className={cn("mx-1 mb-1 flex flex-col gap-2 rounded-8 bg-control p-2", ENTER)}>
			<div className="flex items-center gap-2">
				<input
					maxLength={16}
					value={name}
					disabled={actions.busy}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && void submit()}
					placeholder="Sub-account name"
					aria-label="Sub-account name"
					className="h-8 min-w-0 flex-1 rounded-8 bg-background px-2.5 text-xs outline-none placeholder:text-fg-muted"
				/>
				<button
					type="button"
					disabled={actions.busy}
					onClick={() => void submit()}
					className="h-8 rounded-8 bg-fill px-3 text-xs font-medium text-fg-inverse hover:opacity-90 disabled:opacity-50"
				>
					Create
				</button>
			</div>
			<span className="text-xs text-fg-muted">Starts empty and manual. Move funds in after.</span>
		</div>
	);
}
