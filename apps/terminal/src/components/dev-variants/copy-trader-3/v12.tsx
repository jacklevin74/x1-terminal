import type { DirTrader, VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import { BasketEditor as SharedBasketEditor, Directory as SharedDirectory } from "./shared";
import { DOWN, Frame, linePath, MonthTicks, Stats, UP } from "./spark";

export default function V12(props: VariantProps & { edited?: boolean }) {
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
			head={<span className="ml-1.5 text-fg-muted">each month in its own colour</span>}
			after={(c) => (
				<>
					<MonthTicks c={c} every={1} />
					<Stats c={c} />
				</>
			)}
		>
			{(c) => {
				const groups: { key: string; idx: number[] }[] = [];
				c.series.forEach((p, i) => {
					const key = new Date(p[0]).toISOString().slice(0, 7);
					const g = groups[groups.length - 1];
					if (g && g.key === key) g.idx.push(i);
					else groups.push({ key, idx: [i] });
				});
				return (
					<>
						<line x1={0} x2={c.w} y1={c.zero} y2={c.zero} stroke="var(--color-fg-disabled)" strokeDasharray="2 4" />
						{groups.map((g, gi) => {
							const idx = gi > 0 ? [groups[gi - 1].idx[groups[gi - 1].idx.length - 1], ...g.idx] : g.idx;
							const seg = idx.map((i) => c.pts[i]);
							const up = c.series[idx[idx.length - 1]][1] >= c.series[idx[0]][1];
							return (
								<g key={g.key}>
									{gi > 0 && <line x1={seg[0][0]} x2={seg[0][0]} y1={0} y2={112} stroke="var(--color-control-hover)" />}
									<path
										d={linePath(seg)}
										fill="none"
										stroke={up ? UP : DOWN}
										strokeWidth={2}
										strokeLinejoin="round"
										strokeLinecap="round"
									/>
								</g>
							);
						})}
					</>
				);
			}}
		</Frame>
	);
}
