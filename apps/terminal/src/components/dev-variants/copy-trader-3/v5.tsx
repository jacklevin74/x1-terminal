import { cn } from "@/lib/cn";
import { type DirTrader, usd, type VariantProps } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import {
	ConsistencyHead,
	monthsOf,
	periodsOf,
	BasketEditor as SharedBasketEditor,
	Directory as SharedDirectory,
	tileBg,
	WINDOWS_NOTE,
} from "./shared";

export default function V5(props: VariantProps & { edited?: boolean }) {
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function cell(pnl: number) {
	return usd(pnl, true).replace("$", "");
}

function Consistency({ t }: Props) {
	const months = monthsOf(t);
	if (!months) {
		const { periods } = periodsOf(t);
		return (
			<div className="flex flex-col gap-2">
				<ConsistencyHead t={t} />
				<div className="grid grid-cols-3 gap-2">
					{periods.map((p) => (
						<span
							key={p.label}
							className="flex flex-col gap-0.5 rounded-8 px-3 py-2"
							style={{ background: tileBg(p.pnl) }}
						>
							<span className="text-2xs text-fg-secondary">{p.label}</span>
							<span className="text-xs font-medium tabular-nums">{usd(p.pnl, true)}</span>
						</span>
					))}
				</div>
				<p className="text-2xs text-fg-muted">{WINDOWS_NOTE}</p>
			</div>
		);
	}
	const years = [...new Set(months.map((m) => m.y))].sort();
	const byKey = new Map(months.map((m) => [`${m.y}-${m.m}`, m.pnl]));
	const green = months.filter((m) => m.pnl > 0).length;
	return (
		<div className="flex flex-col gap-2">
			<ConsistencyHead t={t}>
				<span className="ml-1.5 text-fg-muted">
					{green} of {months.length} months green
				</span>
			</ConsistencyHead>
			<div
				className="grid gap-px overflow-hidden rounded-8 bg-background"
				style={{ gridTemplateColumns: "40px repeat(12, minmax(0, 1fr))" }}
			>
				<span className="bg-control" />
				{MONTHS.map((m) => (
					<span key={m} className="bg-control py-1 text-center text-2xs text-fg-muted">
						{m[0]}
					</span>
				))}
				{years.map((yr) => [
					<span key={`y${yr}`} className="flex items-center bg-control px-2 text-2xs text-fg-muted tabular-nums">
						{yr}
					</span>,
					...MONTHS.map((m) => {
						const pnl = byKey.get(`${yr}-${m}`);
						return (
							<span
								key={`${yr}-${m}`}
								title={pnl === undefined ? undefined : `${m} ${yr}: ${usd(pnl, true)}`}
								className={cn(
									"flex h-7 items-center justify-center text-2xs tabular-nums",
									pnl === undefined && "bg-control text-fg-disabled",
								)}
								style={pnl === undefined ? undefined : { background: tileBg(pnl) }}
							>
								{pnl === undefined ? "" : cell(pnl)}
							</span>
						);
					}),
				])}
			</div>
			<p className="text-2xs text-fg-muted">Monthly PNL in USD.</p>
		</div>
	);
}
