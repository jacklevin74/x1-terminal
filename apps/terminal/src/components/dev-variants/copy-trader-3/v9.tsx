import { cn } from "@/lib/cn";
import { type DirTrader, usd, type VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import {
	ConsistencyHead,
	maxDrawdown,
	monthsOf,
	periodsOf,
	BasketEditor as SharedBasketEditor,
	Directory as SharedDirectory,
	seriesOf,
	WINDOWS_NOTE,
} from "./shared";
import { DOWN, Hover, monthLabel, smoothPath, UP, useScale } from "./spark";

export default function V9(props: VariantProps & { edited?: boolean }) {
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

const H = 132;

function niceTicks(min: number, max: number) {
	const span = max - min || 1;
	const raw = span / 3;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? mag;
	const ticks = [];
	for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v);
	return ticks;
}

function Consistency({ t }: Props) {
	const series = seriesOf(t);
	const months = monthsOf(t) ?? [];
	const { ref, w, pts, y, min, max } = useScale({
		series: series ?? [
			[0, 0],
			[1, 0],
		],
		height: H,
		padTop: 8,
		padBottom: 8,
	});
	if (!series) {
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
	const d = smoothPath(pts);
	const last = series[series.length - 1][1];
	const tone = last >= 0 ? UP : DOWN;
	const ticks = niceTicks(min, max);
	const dd = maxDrawdown(months);
	const xTicks = series.filter((_, i) => i % Math.ceil(series.length / 6) === 0);
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t}>
				<span className="ml-1.5 text-fg-muted">cumulative PNL, {months.length} months</span>
			</ConsistencyHead>
			<div className="grid grid-cols-[minmax(0,1fr)_52px] gap-2">
				<div ref={ref} className="min-w-0">
					{w > 0 && (
						<Hover series={series} pts={pts} w={w} height={H}>
							{() => (
								<svg width={w} height={H} className="absolute inset-0 overflow-visible" aria-hidden="true">
									{ticks.map((v) => (
										<line
											key={v}
											x1={0}
											x2={w}
											y1={y(v)}
											y2={y(v)}
											stroke={v === 0 ? "var(--color-fg-disabled)" : "var(--color-control-hover)"}
										/>
									))}
									<path d={d} fill="none" stroke={tone} strokeWidth={2} strokeLinejoin="round" />
									<circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3} fill={tone} />
								</svg>
							)}
						</Hover>
					)}
				</div>
				<div className="relative" style={{ height: H }}>
					{ticks.map((v) => (
						<span
							key={v}
							className="absolute right-0 -translate-y-1/2 text-2xs text-fg-muted tabular-nums"
							style={{ top: y(v) }}
						>
							{usd(v, true).replace("+", "")}
						</span>
					))}
				</div>
			</div>
			<div className="flex justify-between pr-[60px] text-2xs text-fg-muted">
				{xTicks.map((p) => (
					<span key={p[0]}>{monthLabel(p[0])}</span>
				))}
			</div>
			<div className="flex gap-4 text-2xs text-fg-muted tabular-nums">
				<span>
					Net{" "}
					<span className={cn("text-fg", last >= 0 ? "text-market-up" : "text-market-down")}>{usd(last, true)}</span>
				</span>
				<span>
					Max drawdown <span className="text-market-down">{dd.amount ? usd(-dd.amount, true) : "None"}</span>
				</span>
				<span>
					Green months{" "}
					<span className="text-fg">
						{months.filter((m) => m.pnl > 0).length} of {months.length}
					</span>
				</span>
			</div>
		</div>
	);
}
