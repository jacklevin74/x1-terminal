import { cn } from "@/lib/cn";
import { type DirTrader, usd, type VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import {
	ConsistencyHead,
	cumulative,
	maxDrawdown,
	monthsOf,
	periodsOf,
	BasketEditor as SharedBasketEditor,
	Directory as SharedDirectory,
	useWidth,
	WINDOWS_NOTE,
} from "./shared";

export default function V4(props: VariantProps & { edited?: boolean }) {
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

const H = 96;

function Consistency({ t }: Props) {
	const months = monthsOf(t)?.slice(-12) ?? null;
	const { ref, w } = useWidth();
	if (!months) {
		const { periods } = periodsOf(t);
		return (
			<div className="flex flex-col gap-2">
				<ConsistencyHead t={t} />
				<div className="grid grid-cols-3 gap-2">
					{periods.map((p) => (
						<span key={p.label} className="flex flex-col gap-0.5 rounded-8 bg-control-hover px-3 py-2">
							<span className="text-2xs text-fg-muted">{p.label}</span>
							<span
								className={cn("text-xs font-medium tabular-nums", p.pnl >= 0 ? "text-market-up" : "text-market-down")}
							>
								{usd(p.pnl, true)}
							</span>
						</span>
					))}
				</div>
				<p className="text-2xs text-fg-muted">{WINDOWS_NOTE}</p>
			</div>
		);
	}
	const cum = [0, ...cumulative(months)];
	const min = Math.min(...cum);
	const max = Math.max(...cum);
	const span = max - min || 1;
	const green = months.filter((m) => m.pnl > 0).length;
	const dd = maxDrawdown(months);
	const x = (i: number) => (i / (cum.length - 1)) * w;
	const y = (v: number) => 4 + (1 - (v - min) / span) * (H - 8);
	const d = cum.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
	const last = cum[cum.length - 1];
	const tone = last >= 0 ? "var(--color-market-up)" : "var(--color-market-down)";
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t} />
			<div ref={ref} className="w-full" style={{ height: H }}>
				{w > 0 && (
					<svg width={w} height={H} className="overflow-visible" aria-hidden="true">
						<path d={`${d} L${w},${H} L0,${H} Z`} fill={`color-mix(in oklch, ${tone} 14%, var(--color-control))`} />
						<line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="var(--color-fg-disabled)" strokeDasharray="2 3" />
						<path d={d} fill="none" stroke={tone} strokeWidth={2} strokeLinejoin="round" />
						<circle cx={x(cum.length - 1)} cy={y(last)} r={3} fill={tone} />
					</svg>
				)}
			</div>
			<div className="flex justify-between text-2xs text-fg-muted">
				<span>
					{months[0].m} {months[0].y}
				</span>
				<span>
					{months[months.length - 1].m} {months[months.length - 1].y}
				</span>
			</div>
			<div className="grid grid-cols-3 gap-2 text-2xs">
				<span className="flex flex-col gap-0.5">
					<span className="text-fg-muted">Profitable months</span>
					<span className="text-xs font-medium tabular-nums">
						{green} of {months.length}
					</span>
				</span>
				<span className="flex flex-col gap-0.5">
					<span className="text-fg-muted">Max drawdown</span>
					<span className="text-xs font-medium text-market-down tabular-nums">
						{dd.amount ? usd(-dd.amount, true) : "None"}
					</span>
				</span>
				<span className="flex flex-col gap-0.5">
					<span className="text-fg-muted">Net {months.length} months</span>
					<span className={cn("text-xs font-medium tabular-nums", last >= 0 ? "text-market-up" : "text-market-down")}>
						{usd(last, true)}
					</span>
				</span>
			</div>
		</div>
	);
}
