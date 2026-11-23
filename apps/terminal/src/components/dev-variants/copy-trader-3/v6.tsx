import { cn } from "@/lib/cn";
import { type DirTrader, usd, type VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import {
	ConsistencyHead,
	gradeOf,
	longestRun,
	maxDrawdown,
	monthsOf,
	periodsOf,
	BasketEditor as SharedBasketEditor,
	Directory as SharedDirectory,
	WINDOWS_NOTE,
} from "./shared";

export default function V6(props: VariantProps & { edited?: boolean }) {
	return <AutoPanel {...props} Directory={Directory} BasketEditor={BasketEditor} />;
}

function Directory(props: DirectoryProps) {
	return <SharedDirectory {...props} Consistency={Consistency} />;
}

function BasketEditor(props: BasketEditorProps) {
	return <SharedBasketEditor {...props} Consistency={Consistency} />;
}

interface Props {
	t: DirTrader;
}

const R = 22;
const C = 2 * Math.PI * R;

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<span className="flex flex-col gap-0.5 rounded-8 bg-control-hover px-3 py-2">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn("truncate text-xs font-medium tabular-nums", className)}>{value}</span>
		</span>
	);
}

function Consistency({ t }: Props) {
	const months = monthsOf(t);
	if (!months) {
		const { periods } = periodsOf(t);
		return (
			<div className="flex flex-col gap-2">
				<ConsistencyHead t={t}>
					<span className="ml-1.5 text-fg-muted">{gradeOf(t)}</span>
				</ConsistencyHead>
				<div className="grid grid-cols-3 gap-2">
					{periods.map((p) => (
						<Stat
							key={p.label}
							label={`PNL ${p.label}`}
							value={usd(p.pnl, true)}
							className={p.pnl >= 0 ? "text-market-up" : "text-market-down"}
						/>
					))}
				</div>
				<p className="text-2xs text-fg-muted">{WINDOWS_NOTE}</p>
			</div>
		);
	}
	const green = months.filter((m) => m.pnl > 0).length;
	const share = green / months.length;
	const dd = maxDrawdown(months);
	const best = [...months].sort((a, b) => b.pnl - a.pnl)[0];
	const worst = [...months].sort((a, b) => a.pnl - b.pnl)[0];
	return (
		<div className="flex flex-col gap-3">
			<ConsistencyHead t={t}>
				<span className="ml-1.5 text-fg-muted">{gradeOf(t)}</span>
			</ConsistencyHead>
			<div className="flex items-center gap-4">
				<span className="relative grid size-14 flex-none place-items-center">
					<svg width={56} height={56} viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden="true">
						<circle cx={28} cy={28} r={R} fill="none" stroke="var(--color-control-hover)" strokeWidth={5} />
						<circle
							cx={28}
							cy={28}
							r={R}
							fill="none"
							stroke="var(--color-market-up)"
							strokeWidth={5}
							strokeLinecap="round"
							strokeDasharray={C}
							strokeDashoffset={C * (1 - share)}
						/>
					</svg>
					<span className="text-xs font-semibold tabular-nums">{Math.round(share * 100)}%</span>
				</span>
				<span className="flex flex-col gap-0.5">
					<span className="text-xs font-medium tabular-nums">
						{green} of {months.length} months profitable
					</span>
					<span className="text-2xs text-fg-muted tabular-nums">
						Longest green run {longestRun(months, true)}, longest red run {longestRun(months, false)}
					</span>
				</span>
			</div>
			<div className="grid grid-cols-3 gap-2">
				<Stat label="Max drawdown" value={dd.amount ? usd(-dd.amount, true) : "None"} className="text-market-down" />
				<Stat label={`Best month, ${best.m} ${best.y}`} value={usd(best.pnl, true)} className="text-market-up" />
				<Stat
					label={`Worst month, ${worst.m} ${worst.y}`}
					value={usd(worst.pnl, true)}
					className={worst.pnl >= 0 ? "text-market-up" : "text-market-down"}
				/>
			</div>
		</div>
	);
}
