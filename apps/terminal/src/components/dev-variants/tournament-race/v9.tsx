import { pad, prizeFor, type Tier, usd, useTimeLeft } from "@/components/tournament/data";
import { cn } from "@/lib/cn";
import { TraderRow } from "./trader-row";

interface Props {
	tier: Tier;
	className?: string;
}

const SHARE = [50, 30, 20];
const FILL = ["bg-fill text-fg-inverse", "bg-fg-secondary text-fg-inverse", "bg-fg-muted text-fg-inverse"];
const PLACE = ["1st", "2nd", "3rd"];

export function TopThree({ tier, className }: Props) {
	const t = useTimeLeft();
	const top = tier.traders.slice(0, 3);
	return (
		<section className={cn("flex flex-col gap-5 rounded-12 bg-surface p-6", className)}>
			<div className="flex items-end justify-between">
				<div className="flex flex-col gap-1">
					<span className="text-2xs tracking-micro text-fg-muted uppercase">Round 1 pot</span>
					<span className="text-4xl leading-none font-black tracking-tight tabular-nums">{usd(tier.pot)}</span>
				</div>
				<div className="flex items-center gap-1.5 tabular-nums">
					{[String(t.d), pad(t.h), pad(t.m), pad(t.s)].map((v, i) => (
						<span key={["d", "h", "m", "s"][i]} className="flex items-center gap-1.5">
							<span className="grid h-9 w-11 place-items-center rounded-6 bg-control text-lg font-bold">{v}</span>
							{i < 3 && <span className="text-fg-muted">:</span>}
						</span>
					))}
				</div>
			</div>
			<div className="flex h-9 gap-0.5 overflow-hidden rounded-6">
				{top.map((r) => (
					<div
						key={r.address}
						className={cn(
							"flex items-center justify-between px-3 text-xs font-semibold tabular-nums",
							FILL[r.rank - 1],
						)}
						style={{ width: `${SHARE[r.rank - 1]}%` }}
					>
						<span>{PLACE[r.rank - 1]}</span>
						<span>{usd(prizeFor(tier, r.rank))}</span>
					</div>
				))}
			</div>
			<div className="grid grid-cols-3 gap-2">
				{top.map((r) => (
					<TraderRow key={r.address} r={r} className="bg-control" />
				))}
			</div>
		</section>
	);
}
