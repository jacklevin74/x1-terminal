import { AdaptiveModal, Button, ModalContent, ModalFooter, ModalHeader } from "@hypeterminal/ui";
import { WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { useAccountBalances } from "@/hooks/trade/use-account-balances";
import { useAutoSubaccount } from "@/hooks/use-auto-subaccount";
import { cn } from "@/lib/cn";
import { formatToken, formatUSD } from "@/lib/format";
import type { Position } from "@/lib/hyperliquid";

type Where = "main" | "sub";

interface Props {
	open: boolean;
	positions: Position[];
	onCancel: () => void;
	onConfirm: () => void;
}

const TABS: { id: Where; label: string }[] = [
	{ id: "main", label: "Continue on Main" },
	{ id: "sub", label: "Create a sub-account" },
];

const WARNING = "These open positions may be adjusted or closed by Auto Trader.";
const SUB_DEFAULT_NAME = "Auto Trader";

export function AutoStartWarning({ open, positions, onCancel, onConfirm }: Props) {
	const [where, setWhere] = useState<Where>("main");
	const [name, setName] = useState(SUB_DEFAULT_NAME);
	const [amount, setAmount] = useState("");
	const { withdrawable } = useAccountBalances();
	const sub = useAutoSubaccount();
	const available = Number(withdrawable);
	const count = positions.length;

	async function createSub() {
		if (await sub.create(name, Number(amount))) onCancel();
	}

	return (
		<AdaptiveModal open={open} onOpenChange={(next) => !next && !sub.busy && onCancel()} className="max-md:fixed">
			<ModalHeader divider={false}>
				<h2 className="text-base font-medium">Where should Auto Trader run?</h2>
			</ModalHeader>
			<div className="px-4">
				<div className="grid grid-cols-2 rounded-full bg-control p-0.5 text-xs">
					{TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							aria-pressed={where === t.id}
							disabled={sub.busy}
							onClick={() => setWhere(t.id)}
							className={cn(
								"h-8 rounded-full transition-colors",
								where === t.id ? "bg-control-hover font-medium text-fg" : "text-fg-muted hover:text-fg",
							)}
						>
							{t.label}
						</button>
					))}
				</div>
			</div>
			{where === "main" ? (
				<div key="main" className="mood-fade-in">
					<ModalContent className="flex flex-col gap-3">
						<p className="flex items-start gap-2 text-sm">
							<WarningIcon weight="fill" className="mt-0.5 size-4 flex-none text-warning" />
							{WARNING}
						</p>
						<div className="flex flex-col gap-3 rounded-12 bg-control p-3">
							{positions.map((p) => (
								<PositionLine key={p.coin} p={p} />
							))}
						</div>
					</ModalContent>
					<ModalFooter className="pt-0">
						<Button variant="filled" intent="brand" size="md" className="w-full" onClick={onConfirm}>
							Continue
						</Button>
					</ModalFooter>
				</div>
			) : (
				<div key="sub" className="mood-fade-in">
					<ModalContent className="flex flex-col gap-3">
						<p className="text-sm text-fg-secondary">
							Your {count} open {count === 1 ? "position stays" : "positions stay"} on Main and{" "}
							{count === 1 ? "stays" : "stay"} manual. Auto Trader runs in the new sub-account with the USDC you move.
						</p>
						<SubFields
							name={name}
							amount={amount}
							available={withdrawable}
							disabled={sub.busy}
							onName={setName}
							onAmount={setAmount}
						/>
					</ModalContent>
					<ModalFooter className="pt-0">
						<Button
							variant="filled"
							intent="brand"
							size="md"
							className="w-full"
							disabled={sub.busy || !Number(amount) || Number(amount) > available || !name.trim()}
							onClick={() => void createSub()}
						>
							{sub.busy ? "Confirm in wallet…" : "Create sub-account"}
						</Button>
					</ModalFooter>
				</div>
			)}
		</AdaptiveModal>
	);
}

function PositionLine({ p }: { p: Position }) {
	const long = Number(p.szi) > 0;
	const symbol = p.coin.split(":").at(-1) ?? p.coin;
	return (
		<div className="flex items-center gap-2.5 text-xs">
			<AssetDisplay coin={p.coin} hideName iconClassName="size-5" />
			<span className="min-w-0 flex-1">
				<span className="block">
					{symbol} <span className={long ? "text-market-up" : "text-market-down"}>{long ? "Long" : "Short"}</span>{" "}
					<span className="text-fg-muted">
						{p.leverage.value}x {p.leverage.type}
					</span>
				</span>
				<span className="block text-2xs text-fg-muted tabular-nums">
					{formatToken(Math.abs(Number(p.szi)), { minimumFractionDigits: 0 })} {symbol}
				</span>
			</span>
			<span className="text-right tabular-nums">
				<span className="block">{formatUSD(p.positionValue, { decimals: 0, compact: false })}</span>
				<span className={cn("block text-2xs", Number(p.unrealizedPnl) >= 0 ? "text-market-up" : "text-market-down")}>
					{formatUSD(p.unrealizedPnl, { decimals: 0, compact: false, signDisplay: "always" })}
				</span>
			</span>
		</div>
	);
}

interface FieldsProps {
	name: string;
	amount: string;
	available: string;
	disabled: boolean;
	onName: (v: string) => void;
	onAmount: (v: string) => void;
}

function SubFields({ name, amount, available, disabled, onName, onAmount }: FieldsProps) {
	return (
		<div className="flex flex-col gap-2">
			<label className="flex h-10 items-center justify-between gap-3 rounded-8 bg-control px-3 text-xs max-md:h-12 max-md:text-base">
				<span className="text-fg-muted">Name</span>
				<input
					value={name}
					maxLength={16}
					disabled={disabled}
					onChange={(e) => onName(e.target.value)}
					className="min-w-0 flex-1 bg-transparent text-right outline-none"
				/>
			</label>
			<label className="flex h-10 items-center justify-between gap-3 rounded-8 bg-control px-3 text-xs max-md:h-12 max-md:text-base">
				<span className="text-fg-muted">USDC to move</span>
				<input
					value={amount}
					inputMode="decimal"
					placeholder="0.00"
					disabled={disabled}
					onChange={(e) => onAmount(e.target.value.replace(/[^\d.]/g, ""))}
					className="min-w-0 flex-1 bg-transparent text-right tabular-nums outline-none placeholder:text-fg-muted"
				/>
			</label>
			<div className="flex justify-between px-1 text-2xs text-fg-muted">
				<span>From Main account</span>
				<span className="tabular-nums">Available {formatUSD(available)}</span>
			</div>
		</div>
	);
}
