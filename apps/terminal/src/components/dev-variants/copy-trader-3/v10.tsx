import type { DirTrader, VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import { BasketEditor as SharedBasketEditor, Directory as SharedDirectory } from "./shared";
import { Frame, MonthTicks, Stats, smoothPath, X1 } from "./spark";

export default function V10(props: VariantProps & { edited?: boolean }) {
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
			after={(c) => (
				<>
					<MonthTicks c={c} />
					<Stats c={c} />
				</>
			)}
		>
			{(c) => (
				<>
					<line x1={0} x2={c.w} y1={c.zero} y2={c.zero} stroke="var(--color-fg-disabled)" strokeDasharray="2 4" />
					<path d={smoothPath(c.pts)} fill="none" stroke="var(--color-fg)" strokeWidth={1.5} strokeLinejoin="round" />
					<circle cx={c.pts[c.pts.length - 1][0]} cy={c.pts[c.pts.length - 1][1]} r={3.5} fill={X1} />
				</>
			)}
		</Frame>
	);
}
