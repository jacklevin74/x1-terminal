import { cn } from "@/lib/cn";
import type { Outcome } from "@/lib/portfolio/model";
import { V1 } from "./v1";
import { V2 } from "./v2";
import { V3 } from "./v3";
import { V4 } from "./v4";
import { V5 } from "./v5";
import { V6 } from "./v6";
import { V7 } from "./v7";
import { V8 } from "./v8";

const PNLS = [-42, -18, -61, -9, 98, -30, -12, -55, -21, -8, -33, -14, -27, -19, 140, -11];
const OUTCOMES: Outcome[] = PNLS.map((pnl, i) => ({ id: String(i), win: pnl > 0, pnl, coin: "HYPE" }));
const WINS = OUTCOMES.filter((o) => o.win).length;

const VARIANTS = [
	{ n: 1, name: "Tally bars", note: "thin vertical ticks, loss muted, win green", el: V1 },
	{ n: 2, name: "Segment strip", note: "one continuous bar split into equal cells, no gaps", el: V2 },
	{ n: 3, name: "Hollow losses", note: "losses are rings, wins are filled dots", el: V3 },
	{ n: 4, name: "PNL-sized bars", note: "bar height follows the trade's PNL, like a tiny histogram", el: V4 },
	{ n: 5, name: "Share bar", note: "one two-tone bar in win/loss proportion, no per-trade marks", el: V5 },
	{ n: 6, name: "Neutral dots", note: "losses in fg-disabled, only wins carry colour", el: V6 },
	{ n: 7, name: "Squares", note: "tight 6px squares in a grid, reads like a contribution graph", el: V7 },
	{ n: 8, name: "Streak line", note: "a line that steps up on a win and down on a loss", el: V8 },
];

export function WinMarkersGallery() {
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[720px] flex-col gap-8">
				{VARIANTS.map((v) => (
					<section key={v.n} className="flex flex-col gap-3" data-variant={v.n}>
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{v.n}</span>
							<span className="text-fg">{v.name}</span>
							<span className="text-fg-muted">{v.note}</span>
						</div>
						<Row marker={<v.el outcomes={OUTCOMES} className="w-40" />} />
					</section>
				))}
			</div>
		</div>
	);
}

function Row({ marker }: { marker: React.ReactNode }) {
	return (
		<div className="flex flex-col rounded-8 bg-surface text-xs">
			<Line label="Fees paid" value="$6.34" />
			<Line
				label="Win rate"
				value={
					<>
						12.5% <span className="text-fg-muted">{WINS}/16</span>
					</>
				}
				extra={marker}
				active
			/>
			<Line
				label="Leverage"
				value={
					<>
						7.24x <span className="text-fg-muted">$140.28 / $19.38</span>
					</>
				}
			/>
		</div>
	);
}

function Line({
	label,
	value,
	extra,
	active,
}: {
	label: string;
	value: React.ReactNode;
	extra?: React.ReactNode;
	active?: boolean;
}) {
	return (
		<div className={cn("flex h-10 items-center justify-between px-4", active && "bg-control")}>
			<span className="text-fg-muted">{label}</span>
			<span className="flex items-center gap-3 tabular-nums">
				{extra}
				<span className="text-fg">{value}</span>
			</span>
		</div>
	);
}
