import { type DirTrader, pnlTone, usd, type VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import {
	ConsistencyHead,
	gradeOf,
	greenCount,
	Meter,
	periodsOf,
	BasketEditor as SharedBasketEditor,
	Directory as SharedDirectory,
	tileBg,
	WINDOWS_NOTE,
	windowParts,
} from "./shared";

export default function V2(props: VariantProps & { edited?: boolean }) {
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

function metersOf(t: DirTrader, green: number, total: number) {
	if (t.months?.length)
		return [
			{ label: "Green months", value: total ? green / total : 0, text: `${green} of ${total}` },
			{
				label: "Spread across months",
				value: 1 - t.degenParts.concentration,
				text: String(Math.round(100 * (1 - t.degenParts.concentration))),
			},
		];
	const parts = windowParts(t);
	if (!parts) return [];
	return [
		{ label: "Made before 30d", value: parts.track / 50, text: `${parts.track} of 50` },
		{ label: "Windows in profit", value: parts.windows / 30, text: `${parts.windows / 10} of 3` },
		{ label: "All-time return", value: parts.returns / 20, text: `${parts.returns} of 20` },
	];
}

function Consistency({ t }: Props) {
	const { months, periods } = periodsOf(t);
	const meters = metersOf(t, greenCount(periods), periods.length);
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t}>
				<span className="text-fg-muted"> {gradeOf(t)}</span>
			</ConsistencyHead>
			{meters.map((m) => (
				<span key={m.label} className="grid grid-cols-[130px_1fr_48px] items-center gap-2 text-2xs">
					<span className="text-fg-muted">{m.label}</span>
					<Meter value={m.value} />
					<span className="text-right tabular-nums">{m.text}</span>
				</span>
			))}
			{periods.length > 0 && (
				<div className="flex flex-wrap gap-1.5 pt-1">
					{periods.map((p) => (
						<span
							key={p.label}
							className="flex h-6 items-center gap-1.5 rounded-full px-2.5 text-2xs tabular-nums"
							style={{ background: tileBg(p.pnl) }}
						>
							<span className="text-fg-secondary">{p.label}</span>
							<span className={pnlTone(p.pnl)}>{usd(p.pnl, true)}</span>
						</span>
					))}
				</div>
			)}
			{!months && <p className="text-2xs text-fg-muted">{WINDOWS_NOTE}</p>}
		</div>
	);
}
