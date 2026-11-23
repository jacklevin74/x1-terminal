import { Button, SegmentedControlItem, SegmentedControls, Tabs, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { ArrowDownIcon, ArrowUpIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import {
	account,
	lastOf,
	pnlClass,
	RANGES,
	type RangeId,
	SERIES,
	type SeriesId,
	signedUsd,
	TABS,
	type TabId,
	usd,
} from "./data";

interface TabsBarProps {
	value: TabId;
	onChange: (v: TabId) => void;
	counts?: "trade" | "all" | "none";
	mobile?: boolean;
	className?: string;
}

function countFor(id: TabId, count: number, mode: "trade" | "all" | "none") {
	if (mode === "none") return null;
	if (mode === "all") return count;
	if (id === "balances" || id === "positions" || id === "orders" || id === "twap") return count;
	return null;
}

export function TabsBar({ value, onChange, counts = "trade", mobile, className }: TabsBarProps) {
	return (
		<div className={cn("h-10 min-w-0 overflow-x-auto scrollbar-none", className)}>
			<Tabs value={value} onValueChange={(v) => onChange(v as TabId)} variant="underline" className="h-full">
				<TabsList className="h-full min-w-max border-b-0">
					{TABS.map((t) => {
						const c = countFor(t.id, t.count, counts);
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

interface RangeProps {
	size?: "xs" | "sm";
	value: RangeId;
	onChange: (v: RangeId) => void;
	fullWidth?: boolean;
	className?: string;
}

export function RangeSwitch({ value, onChange, fullWidth, className, size }: RangeProps) {
	return (
		<SegmentedControls
			value={value}
			onValueChange={(v) => onChange(v as RangeId)}
			fullWidth={fullWidth}
			size={size}
			className={className}
			aria-label="Range"
		>
			{RANGES.map((r) => (
				<SegmentedControlItem key={r.id} value={r.id}>
					{r.label}
				</SegmentedControlItem>
			))}
		</SegmentedControls>
	);
}

interface SeriesProps {
	size?: "xs" | "sm";
	value: SeriesId;
	onChange: (v: SeriesId) => void;
	fullWidth?: boolean;
	className?: string;
}

export function SeriesSwitch({ value, onChange, fullWidth, className, size }: SeriesProps) {
	return (
		<SegmentedControls
			value={value}
			onValueChange={(v) => onChange(v as SeriesId)}
			fullWidth={fullWidth}
			size={size}
			className={className}
			aria-label="Chart"
		>
			{SERIES.map((s) => (
				<SegmentedControlItem key={s.id} value={s.id}>
					{s.label}
				</SegmentedControlItem>
			))}
		</SegmentedControls>
	);
}

interface ActionsProps {
	size?: "sm" | "md";
	fullWidth?: boolean;
	icons?: boolean;
	className?: string;
}

export function Actions({ size = "md", fullWidth, icons, className }: ActionsProps) {
	const grow = fullWidth ? "flex-1" : undefined;
	return (
		<div className={cn("flex gap-2", className)}>
			<Button variant="filled" intent="neutral" size={size} className={grow}>
				{icons && <ArrowDownIcon className="size-4" />}
				Deposit
			</Button>
			<Button variant="secondary" intent="neutral" size={size} className={grow}>
				{icons && <ArrowUpIcon className="size-4" />}
				Withdraw
			</Button>
			<Button variant="secondary" intent="neutral" size={size} className={grow}>
				{icons && <PaperPlaneTiltIcon className="size-4" />}
				Send
			</Button>
		</div>
	);
}

interface DotsProps {
	className?: string;
	gap?: "gap-0.5" | "gap-1";
}

export function WinDots({ className, gap = "gap-0.5" }: DotsProps) {
	return (
		<div className={cn("flex", gap, className)}>
			{account.outcomes.map((o) => (
				<span
					key={o.id}
					title={o.win ? "Win" : "Loss"}
					className={cn("h-2.5 min-w-0 flex-1 rounded-4", o.win ? "bg-market-up" : "bg-market-down")}
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
				style={{ width: `${Math.min(100, Math.max(1.5, value * 100))}%`, backgroundColor: "var(--color-x1-blue)" }}
			/>
		</div>
	);
}

interface BiasProps {
	className?: string;
}

export function BiasBar({ className }: BiasProps) {
	return (
		<div className={cn("flex h-1.5 gap-0.5", className)}>
			<span
				className="h-full rounded-l-full"
				style={{ width: `${account.longShare * 100}%`, backgroundColor: "var(--color-x1-blue)" }}
			/>
			<span className="h-full flex-1 rounded-r-full bg-fg-disabled" />
		</div>
	);
}

interface SeriesValueProps {
	series: SeriesId;
	range: RangeId;
	className?: string;
}

export function SeriesValue({ series, range, className }: SeriesValueProps) {
	const v = lastOf(series, range);
	if (series === "value") return <span className={cn("text-sm font-medium tabular-nums", className)}>{usd(v)}</span>;
	return <span className={cn("text-sm font-medium tabular-nums", pnlClass(v), className)}>{signedUsd(v)}</span>;
}
