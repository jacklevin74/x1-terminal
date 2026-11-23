import type { DirTrader, VariantProps } from "../copy-trader-2/data";
import { usd } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import { BasketEditor as SharedBasketEditor, Directory as SharedDirectory } from "./shared";
import { Frame, MonthTicks, Stats, smoothPath } from "./spark";

export default function V11(props: VariantProps & { edited?: boolean }) {
	return <AutoPanel {...props} Directory={Directory} BasketEditor={BasketEditor} />;
}

function Directory(props: DirectoryProps) {
	return <SharedDirectory {...props} Consistency={Consistency} />;
}

function BasketEditor(props: BasketEditorProps) {
	return <SharedBasketEditor {...props} Consistency={Consistency} />;
}

function Consistency({ t }: { t: DirTrader }) {
	return (
		<Frame
			t={t}
			height={128}
			padTop={18}
			padBottom={18}
			after={(c) => (
				<>
					<MonthTicks c={c} />
					<Stats c={c} />
				</>
			)}
		>
			{(c) => {
				const d = smoothPath(c.pts);
				const hi = c.series.reduce((a, p, i) => (p[1] > c.series[a][1] ? i : a), 0);
				const lo = c.series.reduce((a, p, i) => (p[1] < c.series[a][1] ? i : a), 0);
				const id = `g11-${t.id}`;
				return (
					<>
						<defs>
							<linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stopColor={`color-mix(in oklch, ${c.tone} 30%, var(--color-control))`} />
								<stop offset="1" stopColor="var(--color-control)" />
							</linearGradient>
						</defs>
						<path d={`${d} L${c.w},${c.y(c.min)} L0,${c.y(c.min)} Z`} fill={`url(#${id})`} />
						<path d={d} fill="none" stroke={c.tone} strokeWidth={2} strokeLinejoin="round" />
						<text
							x={c.pts[hi][0]}
							y={c.pts[hi][1] - 7}
							textAnchor={c.pts[hi][0] > c.w - 40 ? "end" : "middle"}
							className="fill-fg-secondary text-2xs tabular-nums"
						>
							{usd(c.series[hi][1], true)}
						</text>
						<text
							x={c.pts[lo][0]}
							y={c.pts[lo][1] + 13}
							textAnchor={c.pts[lo][0] < 40 ? "start" : "middle"}
							className="fill-fg-secondary text-2xs tabular-nums"
						>
							{usd(c.series[lo][1], true)}
						</text>
					</>
				);
			}}
		</Frame>
	);
}
