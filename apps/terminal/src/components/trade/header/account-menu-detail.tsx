import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { CopyStateIcon } from "@/components/ui/copy-state-icon";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { useSubaccountActions } from "@/hooks/use-subaccount-actions";
import { cn } from "@/lib/cn";
import { formatUSD } from "@/lib/format";
import type { MenuAccount } from "./account-menu-types";
import { AccountModeLine } from "./account-mode-line";

const ENTER = "transition-[opacity,scale] duration-150 starting:scale-[0.97] starting:opacity-0";

type Dir = "in" | "out" | null;

interface Props {
	account: MenuAccount;
	main: MenuAccount;
	active: boolean;
	canMove: boolean;
	switchDisabled: boolean;
	onBack: () => void;
	onSwitch: () => void;
	onMoved: () => void;
}

export function AccountMenuDetail({
	account,
	main,
	active,
	canMove,
	switchDisabled,
	onBack,
	onSwitch,
	onMoved,
}: Props) {
	const [dir, setDir] = useState<Dir>(null);
	const { copied, copy } = useCopyToClipboard();
	const short = `${account.address.slice(0, 6)}…${account.address.slice(-4)}`;
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
				<span className="text-base font-medium tabular-nums">{formatUSD(account.value, { compact: false })}</span>
				<AccountModeLine address={account.address} />
			</div>
			<div className="mt-1 flex items-center justify-between rounded-8 bg-control py-1 pr-1 pl-3 text-xs">
				<span className="text-fg-muted">Address</span>
				<span className="flex items-center gap-1 tabular-nums">
					{short}
					<button
						type="button"
						aria-label={`Copy ${account.name} address`}
						onClick={() => void copy(account.address)}
						className="grid size-7 place-items-center rounded-6 text-fg-muted hover:bg-control-hover hover:text-fg"
					>
						<CopyStateIcon copied={copied} announcement="Address copied" />
					</button>
				</span>
			</div>
			{canMove && !account.master && (
				<div className="mt-2 grid grid-cols-2 gap-1">
					<Choice label="Add from Main" on={dir === "in"} onClick={() => setDir(dir === "in" ? null : "in")} />
					<Choice label="Return to Main" on={dir === "out"} onClick={() => setDir(dir === "out" ? null : "out")} />
				</div>
			)}
			{canMove && dir && !account.master && (
				<MoveForm key={dir} sub={account} from={dir === "in" ? main : account} toSub={dir === "in"} onMoved={onMoved} />
			)}
			{!active && (
				<button
					type="button"
					disabled={switchDisabled}
					onClick={onSwitch}
					className="mt-3 h-9 rounded-8 bg-control text-xs font-medium hover:bg-control-hover disabled:text-fg-disabled"
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

interface MoveProps {
	sub: MenuAccount;
	from: MenuAccount;
	toSub: boolean;
	onMoved: () => void;
}

function MoveForm({ sub, from, toSub, onMoved }: MoveProps) {
	const [amount, setAmount] = useState("");
	const actions = useSubaccountActions();
	async function submit() {
		if (!(await actions.transfer(sub, toSub, Number(amount)))) return;
		setAmount("");
		onMoved();
	}
	return (
		<div className={cn("mt-2 flex flex-col gap-2", ENTER)}>
			<div className="flex items-center gap-2">
				<span className="flex h-8 flex-1 items-center gap-1 rounded-8 bg-control px-2.5 text-xs">
					<span className="text-fg-muted">$</span>
					<input
						value={amount}
						onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
						onKeyDown={(e) => e.key === "Enter" && void submit()}
						inputMode="decimal"
						placeholder="0.00"
						aria-label="Amount in USDC"
						disabled={actions.busy}
						className="w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-fg-muted"
					/>
					<button
						type="button"
						onClick={() => setAmount(from.withdrawable ?? "")}
						className="text-fg-muted hover:text-fg"
					>
						Max
					</button>
				</span>
				<button
					type="button"
					disabled={actions.busy}
					onClick={() => void submit()}
					className="h-8 rounded-8 bg-fill px-3 text-xs font-medium text-fg-inverse hover:opacity-90 disabled:opacity-50"
				>
					Move
				</button>
			</div>
			<span className="text-xs text-fg-muted tabular-nums">
				{formatUSD(from.withdrawable, { compact: false })} available in {from.name}
			</span>
		</div>
	);
}
