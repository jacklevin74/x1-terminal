import type { DirTrader, VariantProps } from "../copy-trader-2/data";
import { usd } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import { BasketEditor as SharedBasketEditor, Directory as SharedDirectory } from "./shared";
import { Frame, linePath, MonthTicks, Stats } from "./spark";

export default function V14(props: VariantProps & { edited?: boolean }) {
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
			height={112}
			padTop={10}
			after={(c) => (
				<>
					<MonthTicks c={c} />
					<Stats c={c} />
				</>
			)}
		>
			{(c) => (
				<>
					<line x1={0} x2={c.w} y1={c.zero} y2={c.zero} stroke="var(--color-control-hover)" />
					<path d={linePath(c.pts)} fill="none" stroke={c.tone} strokeWidth={1.25} strokeLinejoin="round" />
					{c.pts.map((p, i) => (
						<circle key={c.series[i][0]} cx={p[0]} cy={p[1]} r={1.6} fill={c.tone} />
					))}
					<rect
						x={Math.min(c.pts[c.pts.length - 1][0] + 6, c.w - 64)}
						y={c.pts[c.pts.length - 1][1] - 9}
						width={60}
						height={18}
						rx={4}
						fill="var(--color-fill)"
					/>
					<text
						x={Math.min(c.pts[c.pts.length - 1][0] + 36, c.w - 34)}
						y={c.pts[c.pts.length - 1][1] + 4}
						textAnchor="middle"
						className="fill-fg-inverse text-2xs font-medium tabular-nums"
					>
						{usd(c.last, true)}
					</text>
				</>
			)}
		</Frame>
	);
}
