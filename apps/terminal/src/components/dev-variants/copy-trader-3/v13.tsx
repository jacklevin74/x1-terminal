import type { DirTrader, VariantProps } from "../copy-trader-2/data";
import { usd } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import { BasketEditor as SharedBasketEditor, Directory as SharedDirectory } from "./shared";
import { DOWN, Frame, MonthTicks, Stats, smoothPath } from "./spark";

export default function V13(props: VariantProps & { edited?: boolean }) {
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
			height={120}
			head={<span className="ml-1.5 text-fg-muted">drawdowns from the peak shaded</span>}
			after={(c) => (
				<>
					<MonthTicks c={c} />
					<Stats c={c} />
				</>
			)}
		>
			{(c) => {
				let peak = -Infinity;
				const peakPts: [number, number][] = [];
				let worst = { amount: 0, i: 0 };
				c.series.forEach((p, i) => {
					peak = Math.max(peak, p[1]);
					peakPts.push([c.pts[i][0], c.y(peak)]);
					if (peak - p[1] > worst.amount) worst = { amount: peak - p[1], i };
				});
				const line = smoothPath(c.pts);
				const peakLine = peakPts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
				const between = `${peakLine} ${[...c.pts]
					.reverse()
					.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)
					.join(" ")} Z`;
				return (
					<>
						<path d={between} fill={`color-mix(in oklch, ${DOWN} 26%, var(--color-control))`} />
						<path d={peakLine} fill="none" stroke="var(--color-fg-disabled)" strokeWidth={1} strokeDasharray="2 3" />
						<path d={line} fill="none" stroke="var(--color-fg)" strokeWidth={1.75} strokeLinejoin="round" />
						{worst.amount > 0 && (
							<text
								x={Math.min(c.pts[worst.i][0] + 6, c.w - 60)}
								y={c.pts[worst.i][1] + 4}
								className="fill-market-down text-2xs tabular-nums"
							>
								{usd(-worst.amount, true)}
							</text>
						)}
					</>
				);
			}}
		</Frame>
	);
}
