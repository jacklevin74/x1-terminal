import { cn } from "@/lib/cn";
import { type DirTrader, pnlTone, usd, type VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import {
	biggestShare,
	ConsistencyHead,
	greenCount,
	pctText,
	periodsOf,
	BasketEditor as SharedBasketEditor,
	Directory as SharedDirectory,
	WINDOWS_NOTE,
} from "./shared";

export default function V1(props: VariantProps & { edited?: boolean }) {
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
	const up = Math.max(0, ...periods.map((p) => p.pnl));
	const down = Math.max(0, ...periods.map((p) => -p.pnl));
	const range = up + down || 1;
	const zero = (up / range) * 100;
	const share = months ? biggestShare(periods) : t.degenParts.concentration;
	return (
		<div className="flex flex-col gap-3">
			<ConsistencyHead t={t} />
			<span className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
				<span>
					{greenCount(periods)} of {periods.length} {months ? "months" : "windows"} green
				</span>
				<span className="text-fg-muted">
					{months ? "Biggest month" : "Last 30d is"} {pctText(share)} of the total
				</span>
			</span>
			{periods.length > 0 && (
				<div className="flex gap-2">
					{periods.map((p) => (
						<span key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
							<span className="relative h-20 w-full">
								<span className="absolute inset-x-0 h-px bg-control-hover" style={{ top: `${zero}%` }} />
								<span
									className={cn("absolute inset-x-2 rounded-4", p.pnl >= 0 ? "bg-market-up" : "bg-market-down")}
									style={
										p.pnl >= 0
											? { bottom: `${100 - zero}%`, height: `${(p.pnl / range) * 100}%` }
											: { top: `${zero}%`, height: `${(-p.pnl / range) * 100}%` }
									}
								/>
							</span>
							<span className="text-2xs text-fg-muted">{p.label}</span>
							<span className={cn("text-2xs font-medium tabular-nums", pnlTone(p.pnl))}>{usd(p.pnl, true)}</span>
						</span>
					))}
				</div>
			)}
			{!months && <p className="text-2xs text-fg-muted">{WINDOWS_NOTE}</p>}
		</div>
	);
}
