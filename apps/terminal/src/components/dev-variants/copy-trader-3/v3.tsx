import { type DirTrader, usd, type VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import {
	ConsistencyHead,
	periodsOf,
	BasketEditor as SharedBasketEditor,
	Directory as SharedDirectory,
	tileBg,
	WINDOWS_NOTE,
} from "./shared";

export default function V3(props: VariantProps & { edited?: boolean }) {
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

function Consistency({ t }: Props) {
	const { months, periods } = periodsOf(t);
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t} />
			{periods.length > 0 && (
				<>
					<div
						className="grid gap-1.5"
						style={{ gridTemplateColumns: `repeat(${Math.min(periods.length, 6)}, minmax(0, 1fr))` }}
					>
						{periods.map((p) => (
							<span
								key={p.label}
								className="flex min-w-0 flex-col gap-0.5 rounded-8 px-2.5 py-2"
								style={{ background: tileBg(p.pnl) }}
							>
								<span className="truncate text-2xs text-fg-secondary">{p.label}</span>
								<span className="truncate text-xs font-medium tabular-nums">{usd(p.pnl, true)}</span>
							</span>
						))}
					</div>
				</>
			)}
			{!months && <p className="text-2xs text-fg-muted">{WINDOWS_NOTE}</p>}
		</div>
	);
}
