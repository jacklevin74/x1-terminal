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

export default function V7(props: VariantProps & { edited?: boolean }) {
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

const H = 120;

function Consistency({ t }: Props) {
	const series = seriesOf(t);
	const months = monthsOf(t) ?? [];
	const { ref, w, pts, zero } = useScale({
		series: series ?? [
			[0, 0],
			[1, 0],
		],
		height: H,
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
	const green = months.filter((m) => m.pnl > 0).length;
	const dd = maxDrawdown(months);
	const ticks = series.filter((_, i) => i % Math.ceil(series.length / 4) === 0);
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t} />
			<div ref={ref} className="w-full">
				{w > 0 && (
					<Hover series={series} pts={pts} w={w} height={H}>
						{() => (
							<svg width={w} height={H} className="absolute inset-0 overflow-visible" aria-hidden="true">
								<defs>
									<clipPath id={`up-${t.id}`}>
										<rect x={0} y={0} width={w} height={zero} />
									</clipPath>
									<clipPath id={`down-${t.id}`}>
										<rect x={0} y={zero} width={w} height={H - zero} />
									</clipPath>
								</defs>
								<path
									d={`${d} L${w},${zero} L0,${zero} Z`}
									fill={`color-mix(in oklch, ${UP} 16%, var(--color-control))`}
									clipPath={`url(#up-${t.id})`}
								/>
								<path
									d={`${d} L${w},${zero} L0,${zero} Z`}
									fill={`color-mix(in oklch, ${DOWN} 16%, var(--color-control))`}
									clipPath={`url(#down-${t.id})`}
								/>
								<line x1={0} x2={w} y1={zero} y2={zero} stroke="var(--color-fg-disabled)" strokeDasharray="2 4" />
								<path
									d={d}
									fill="none"
									stroke={UP}
									strokeWidth={1.75}
									strokeLinejoin="round"
									clipPath={`url(#up-${t.id})`}
								/>
								<path
									d={d}
									fill="none"
									stroke={DOWN}
									strokeWidth={1.75}
									strokeLinejoin="round"
									clipPath={`url(#down-${t.id})`}
								/>
								<circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3} fill={last >= 0 ? UP : DOWN} />
							</svg>
						)}
					</Hover>
				)}
			</div>
			<div className="flex justify-between text-2xs text-fg-muted">
				{ticks.map((p) => (
					<span key={p[0]}>{monthLabel(p[0])}</span>
				))}
				<span>Now</span>
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
