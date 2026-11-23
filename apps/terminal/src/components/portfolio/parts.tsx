import { Button, Tabs, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Outcome, TABS, type TabId } from "@/lib/portfolio/model";
import { useDepositModalActions } from "@/stores/use-global-modal-store";
import { SendModal } from "../trade/positions/send-modal";

interface TabsBarProps {
	value: TabId;
	onChange: (v: TabId) => void;
	counts: Record<TabId, number | null>;
	mobile?: boolean;
	className?: string;
}

export function TabsBar({ value, onChange, counts, mobile, className }: TabsBarProps) {
	return (
		<div className={cn("h-10 min-w-0 overflow-x-auto scrollbar-none", className)}>
			<Tabs value={value} onValueChange={(v) => onChange(v as TabId)} variant="underline" className="h-full">
				<TabsList className="h-full min-w-max border-b-0">
					{TABS.map((t) => {
						const c = counts[t.id];
						return (
							<TabsTrigger key={t.id} value={t.id} className="h-full py-0">
								{mobile ? t.mobile : t.label}
								{c !== null && <span className="text-fg-muted tabular-nums">{c}</span>}
							</TabsTrigger>
						);
					})}
				</TabsList>
			</Tabs>
		</div>
	);
}

interface ActionsProps {
	size?: "sm" | "md";
	className?: string;
}

export function Actions({ size = "md", className }: ActionsProps) {
	const { open: openDepositModal } = useDepositModalActions();
	const [sendOpen, setSendOpen] = useState(false);
	return (
		<div className={cn("flex gap-2", className)}>
			<Button
				variant="filled"
				intent="neutral"
				size={size}
				className="flex-1"
				onClick={() => openDepositModal("deposit")}
			>
				Deposit
			</Button>
			<Button
				variant="secondary"
				intent="neutral"
				size={size}
				className="flex-1"
				onClick={() => openDepositModal("withdraw")}
			>
				Withdraw
			</Button>
			<Button variant="secondary" intent="neutral" size={size} className="flex-1" onClick={() => setSendOpen(true)}>
				Send
			</Button>
			<SendModal open={sendOpen} onOpenChange={setSendOpen} />
		</div>
	);
}

interface DotsProps {
	outcomes: Outcome[];
	className?: string;
}

const WIN_TICKS = 40;

export function WinDots({ outcomes, className }: DotsProps) {
	return (
		<div className={cn("flex h-3 items-center justify-between", className)}>
			{outcomes.slice(-WIN_TICKS).map((o) => (
				<span
					key={o.id}
					title={o.win ? "Win" : "Loss"}
					className={cn("h-full w-0.5 flex-none rounded-full", o.win ? "bg-market-up" : "bg-fg-disabled")}
				/>
			))}
		</div>
	);
}

interface MeterProps {
	value: number;
	className?: string;
}

export function Meter({ value, className }: MeterProps) {
	return (
		<div className={cn("h-1.5 overflow-hidden rounded-full bg-control", className)}>
			<div
				className="h-full rounded-full"
				style={{ width: `${Math.min(100, Math.max(1.5, value * 100))}%`, backgroundColor: "var(--color-fg-secondary)" }}
			/>
		</div>
	);
}

interface BiasProps {
	longShare: number;
	className?: string;
}

export function BiasBar({ longShare, className }: BiasProps) {
	return (
		<div className={cn("flex h-1.5 gap-0.5", className)}>
			<span
				className="h-full rounded-l-full"
				style={{ width: `${longShare * 100}%`, backgroundColor: "var(--color-fg-secondary)" }}
			/>
			<span className="h-full flex-1 rounded-r-full bg-fg-disabled" />
		</div>
	);
}
