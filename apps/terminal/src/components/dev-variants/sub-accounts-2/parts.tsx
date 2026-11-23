import { CodeIcon, SignOutIcon, SlidersHorizontalIcon, TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { AutoIconStack } from "@/components/trade/auto/auto-icon-stack";
import { cn } from "@/lib/cn";
import { type Account, type AccountsApi, modeLabel, usd } from "../sub-accounts/data";

export type Scene = "default" | "transfer";

export interface SceneProps {
	scene: Scene;
}

export const DEEP_ID = "s1";
export const ENTER = "transition-[opacity,scale] duration-150 starting:scale-[0.97] starting:opacity-0";
export const MENU =
	"absolute top-11 right-[52px] z-40 flex origin-top-right flex-col rounded-12 bg-overlay shadow-menu";

export function copyAddress(account: Account) {
	navigator.clipboard?.writeText(account.address).catch(() => {});
	toast.success(`${account.name} address copied`);
}

export function ModeLine({ account, className }: { account: Account; className?: string }) {
	const { mode } = account;
	if (mode.kind === "basket")
		return (
			<span className={cn("flex items-center gap-1.5 text-xs text-fg-muted", className)}>
				<AutoIconStack coins={mode.markets} max={3} size="size-3.5" />
				{modeLabel(mode)}
			</span>
		);
	if (mode.kind === "copy")
		return (
			<span className={cn("flex items-center gap-1 text-xs text-fg-muted", className)}>
				{mode.bias === "bullish" ? (
					<TrendUpIcon weight="bold" className="size-3 text-market-up" />
				) : (
					<TrendDownIcon weight="bold" className="size-3 text-market-down" />
				)}
				{modeLabel(mode)}
			</span>
		);
	return <span className={cn("text-xs text-fg-muted", className)}>Manual</span>;
}

interface MoveProps {
	api: AccountsApi;
	fromId: string;
	toId: string;
	field?: string;
	className?: string;
}

export function MoveForm({ api, fromId, toId, field = "bg-background", className }: MoveProps) {
	const [amount, setAmount] = useState("");
	const from = api.accounts.find((a) => a.id === fromId) ?? api.accounts[0];
	function submit() {
		if (api.transfer(fromId, toId, Number(amount))) setAmount("");
	}
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="flex items-center gap-2">
				<span className={cn("flex h-8 flex-1 items-center gap-1 rounded-8 px-2.5 text-xs", field)}>
					<span className="text-fg-muted">$</span>
					<input
						value={amount}
						onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
						onKeyDown={(e) => e.key === "Enter" && submit()}
						inputMode="decimal"
						placeholder="0.00"
						aria-label="Amount in USDC"
						className="w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-fg-muted"
					/>
					<button type="button" onClick={() => setAmount(String(from.balance))} className="text-fg-muted hover:text-fg">
						Max
					</button>
				</span>
				<button
					type="button"
					onClick={submit}
					className="h-8 rounded-8 bg-fill px-3 text-xs font-medium text-fg-inverse hover:opacity-90"
				>
					Move
				</button>
			</div>
			<span className="text-xs text-fg-muted tabular-nums">
				{usd(from.balance)} available in {from.name}
			</span>
		</div>
	);
}

interface DirectionProps {
	name: string;
	toSub: boolean;
	onChange: (toSub: boolean) => void;
	track?: string;
}

export function Direction({ name, toSub, onChange, track = "bg-background" }: DirectionProps) {
	return (
		<div className={cn("flex h-7 rounded-8 p-0.5 text-xs", track)}>
			<button
				type="button"
				aria-pressed={toSub}
				onClick={() => onChange(true)}
				className={cn("flex-1 rounded-6", toSub ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg")}
			>
				Main to {name}
			</button>
			<button
				type="button"
				aria-pressed={!toSub}
				onClick={() => onChange(false)}
				className={cn("flex-1 rounded-6", toSub ? "text-fg-muted hover:text-fg" : "bg-control-hover text-fg")}
			>
				{name} to Main
			</button>
		</div>
	);
}

interface CreateProps {
	api: AccountsApi;
	onDone?: () => void;
	field?: string;
	quiet?: boolean;
	className?: string;
}

export function CreateForm({ api, onDone, field = "bg-background", quiet = false, className }: CreateProps) {
	const [name, setName] = useState("");
	function submit() {
		if (!api.create(name)) return;
		setName("");
		onDone?.();
	}
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="flex items-center gap-2">
				<input
					maxLength={16}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					placeholder="Sub-account name"
					aria-label="Sub-account name"
					className={cn("h-8 min-w-0 flex-1 rounded-8 px-2.5 text-xs outline-none placeholder:text-fg-muted", field)}
				/>
				<button
					type="button"
					onClick={submit}
					className={cn(
						"h-8 rounded-8 px-3 text-xs font-medium",
						quiet ? "bg-control-hover hover:text-fg-secondary" : "bg-fill text-fg-inverse hover:opacity-90",
					)}
				>
					Create
				</button>
			</div>
			<span className="text-xs text-fg-muted">Starts empty and manual. Move funds in after.</span>
		</div>
	);
}

interface ItemProps {
	icon: ReactNode;
	label: string;
	detail?: ReactNode;
	onClick?: () => void;
}

export function Item({ icon, label, detail, onClick }: ItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex h-7 items-center gap-2 rounded-8 px-2 text-left text-xs hover:bg-control"
		>
			<span className="text-fg-muted">{icon}</span>
			{label}
			{detail && <span className="ml-auto text-fg-muted">{detail}</span>}
		</button>
	);
}

export function Divider() {
	return <div className="my-1 h-px flex-none bg-stroke-weak" />;
}

export function FooterItems() {
	return (
		<>
			<Divider />
			<Item icon={<CodeIcon className="size-4" />} label="API wallets" />
			<Item icon={<SlidersHorizontalIcon className="size-4" />} label="Trading setup" detail="0.05% fee" />
			<Divider />
			<Item icon={<SignOutIcon className="size-4" />} label="Disconnect" />
		</>
	);
}
