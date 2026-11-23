import { cn } from "@/lib/cn";
import { type DirTrader, usd, type VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import {
	ConsistencyHead,
	monthsOf,
	periodsOf,
	BasketEditor as SharedBasketEditor,
	Directory as SharedDirectory,
	seriesOf,
	WINDOWS_NOTE,
} from "./shared";
import { DOWN, Hover, linePath, monthLabel, UP, useScale } from "./spark";

export default function V8(props: VariantProps & { edited?: boolean }) {
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
	const series = seriesOf(t);
	const months = monthsOf(t) ?? [];
	const { ref, w, pts, zero } = useScale({
		series: series ?? [
			[0, 0],
			[1, 0],
		],
		height: H,
		padTop: 4,
		padBottom: 4,
	});
	if (!series) {
		const { periods } = periodsOf(t);
		return (
			<div className="flex flex-col gap-2">
				<ConsistencyHead t={t} />
				<p className="text-2xs text-fg-muted">
					{periods.map((p) => `${p.label} ${usd(p.pnl, true)}`).join(", ")}. {WINDOWS_NOTE}
				</p>
			</div>
		);
	}
	const d = linePath(pts);
	const last = series[series.length - 1][1];
	const green = months.filter((m) => m.pnl > 0).length;
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t}>
				<span className="ml-1.5 text-fg-muted">
					{green} of {months.length} months green
				</span>
			</ConsistencyHead>
			<div className="flex items-end gap-4">
				<div ref={ref} className="min-w-0 flex-1">
					{w > 0 && (
						<Hover series={series} pts={pts} w={w} height={H}>
							{() => (
								<svg width={w} height={H} className="absolute inset-0 overflow-visible" aria-hidden="true">
									<defs>
										<clipPath id={`u8-${t.id}`}>
											<rect x={0} y={0} width={w} height={zero} />
										</clipPath>
										<clipPath id={`d8-${t.id}`}>
											<rect x={0} y={zero} width={w} height={H - zero} />
										</clipPath>
									</defs>
									<line x1={0} x2={w} y1={zero} y2={zero} stroke="var(--color-control-hover)" />
									<path
										d={d}
										fill="none"
										stroke={UP}
										strokeWidth={1.5}
										strokeLinejoin="round"
										clipPath={`url(#u8-${t.id})`}
									/>
									<path
										d={d}
										fill="none"
										stroke={DOWN}
										strokeWidth={1.5}
										strokeLinejoin="round"
										clipPath={`url(#d8-${t.id})`}
									/>
								</svg>
							)}
						</Hover>
					)}
					<div className="mt-1 flex justify-between text-2xs text-fg-muted">
						<span>{monthLabel(series[0][0])}</span>
						<span>Now</span>
					</div>
				</div>
				<span className="flex flex-col items-end gap-0.5 pb-5">
					<span
						className={cn(
							"text-base leading-none font-semibold tabular-nums",
							last >= 0 ? "text-market-up" : "text-market-down",
						)}
					>
						{usd(last, true)}
					</span>
					<span className="text-2xs text-fg-muted">{months.length} months</span>
				</span>
			</div>
		</div>
	);
}
