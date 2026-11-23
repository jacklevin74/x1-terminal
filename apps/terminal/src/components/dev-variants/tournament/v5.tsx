import { PokerChipIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
	clock,
	MY_TIER,
	me,
	PAYOUT_SHARE,
	pct,
	placeLabel,
	pnlClass,
	short,
	signedUsd,
	type Tier,
	type TierId,
	type Trader,
	tierIds,
	tiers,
	usd,
	usdCompact,
	useTimeLeft,
} from "./data";

const css = `
.t5-in{animation:t5-in .24s cubic-bezier(.2,.8,.2,1)}
@keyframes t5-in{from{opacity:0;transform:scale(.97)}}
`;

const SEATS = 6;
const SPREAD = 0.62;
const SEAT_ANGLES = [
	-Math.PI / 2,
	-Math.PI / 2 - SPREAD,
	-Math.PI / 2 + SPREAD,
	Math.PI / 2,
	Math.PI / 2 + SPREAD,
	Math.PI / 2 - SPREAD,
];
const TABLE_W = 420;
const TABLE_H = 188;
const COLS = "grid-cols-[56px_1fr_150px_150px_100px_150px]";

export default function V5() {
	const [tierId, setTierId] = useState<TierId>(MY_TIER);
	const [seated, setSeated] = useState(false);
	const tier = tiers[tierId];
	const t = useTimeLeft();

	function sit(id: TierId) {
		setTierId(id);
		if (id !== MY_TIER) return;
		setSeated(true);
		toast.success(`You sit at the ${tiers[id].label.toLowerCase()}. Your trades on X1 Terminal count this round.`);
	}

	return (
		<>
			<style>{css}</style>
			<div className="absolute rounded-xs bg-background px-2 py-1 text-sm text-fg" style={{ left: 662, top: 11 }}>
				Tournament
			</div>
			<div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-background p-1" style={{ top: 48 }}>
				<div className="flex flex-none gap-1">
					{tierIds.map((id) => (
						<TableCard
							key={id}
							tier={tiers[id]}
							active={id === tierId}
							seated={seated && id === MY_TIER}
							eligible={id === MY_TIER}
							timeLeft={clock(t)}
							onSelect={() => setTierId(id)}
							onSit={() => sit(id)}
						/>
					))}
				</div>
				<div key={tierId} className="t5-in flex min-h-0 flex-1 flex-col rounded-8 bg-surface">
					<div className="flex h-11 flex-none items-center justify-between px-4">
						<span className="text-sm font-medium">{tier.label} standings</span>
						<span className="text-xs text-fg-muted">Ranked by dollar PNL this round</span>
					</div>
					<div className={cn("grid h-7 flex-none items-center gap-3 bg-band px-4 text-xs text-fg-muted", COLS)}>
						<span>Rank</span>
						<span>Trader</span>
						<span className="text-right">Account value</span>
						<span className="text-right">Round PNL</span>
						<span className="text-right">ROI</span>
						<span className="text-right">Payout</span>
					</div>
					{tierId === MY_TIER && <Line r={me} payout={null} you />}
					<div className="min-h-0 flex-1 overflow-y-auto">
						{tier.traders.map((r, i) => (
							<Line key={r.address} r={r} payout={i < 3 ? tier.payouts[i] : null} />
						))}
					</div>
				</div>
			</div>
		</>
	);
}

interface CardProps {
	tier: Tier;
	active: boolean;
	seated: boolean;
	eligible: boolean;
	timeLeft: string;
	onSelect: () => void;
	onSit: () => void;
}

function TableCard({ tier, active, seated, eligible, timeLeft, onSelect, onSit }: CardProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: card holds a nested button
		<div
			role="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(e) => e.key === "Enter" && onSelect()}
			className={cn(
				"flex flex-1 cursor-pointer flex-col items-center rounded-8 px-6 pt-5 pb-5 transition-colors",
				active ? "bg-surface" : "bg-surface opacity-70 hover:opacity-100",
			)}
		>
			<div className="flex w-full items-center justify-between text-xs">
				<span className="flex items-center gap-2">
					<PokerChipIcon className="size-4 text-fg-muted" />
					<span className="text-sm font-medium text-fg">{tier.label}</span>
					<span className="text-fg-muted">{tier.rule}</span>
				</span>
				<span className="text-fg-muted tabular-nums">Ends in {timeLeft}</span>
			</div>
			<Felt tier={tier} />
			<div className="mt-1 flex w-full items-center gap-2">
				{tier.payouts.map((p, i) => (
					<span
						key={placeLabel[i]}
						className="flex h-8 items-center gap-1.5 rounded-full bg-control px-3 text-xs tabular-nums"
					>
						<span className="text-fg-muted">{placeLabel[i]}</span>
						{usdCompact(p)}
					</span>
				))}
				<span className="ml-2 text-xs text-fg-muted">Top 3 share {PAYOUT_SHARE * 100}%</span>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onSit();
					}}
					disabled={seated}
					className={cn(
						"ml-auto h-9 rounded-full px-4 text-sm font-medium transition-colors",
						eligible ? "bg-fill text-fg-inverse hover:opacity-90" : "bg-control text-fg-muted hover:text-fg",
						seated && "bg-control text-fg opacity-100",
					)}
				>
					{seated ? "Seated" : eligible ? "Take a seat" : "Watch"}
				</button>
			</div>
		</div>
	);
}

function Felt({ tier }: { tier: Tier }) {
	const seats = tier.traders.slice(0, SEATS);
	const rx = TABLE_W / 2 + 6;
	const ry = TABLE_H / 2 + 8;
	return (
		<div className="relative mt-8 mb-4" style={{ width: TABLE_W + 140, height: TABLE_H + 96 }}>
			<div
				className="absolute rounded-full bg-control p-3"
				style={{ left: 70, top: 48, width: TABLE_W, height: TABLE_H }}
			>
				<div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-control-hover">
					<span className="text-2xs tracking-micro text-fg-muted uppercase">Pot so far</span>
					<span className="text-xl font-semibold tabular-nums">{usd(tier.pot)}</span>
					<span className="text-xs text-fg-muted tabular-nums">{tier.count.toLocaleString()} traders</span>
				</div>
			</div>
			{seats.map((r, i) => {
				const angle = SEAT_ANGLES[i];
				const x = 70 + TABLE_W / 2 + Math.cos(angle) * rx;
				const y = 48 + TABLE_H / 2 + Math.sin(angle) * ry;
				return <Seat key={r.address} r={r} x={x} y={y} below={Math.sin(angle) > 0} />;
			})}
		</div>
	);
}

function Seat({ r, x, y, below }: { r: Trader; x: number; y: number; below: boolean }) {
	return (
		<div
			className={cn("absolute flex items-center gap-2", below ? "flex-col" : "flex-col-reverse")}
			style={{ left: x, top: y, transform: `translate(-50%, ${below ? "-20px" : "calc(-100% + 20px)"})` }}
		>
			<span
				className={cn(
					"grid size-10 place-items-center rounded-full text-sm font-semibold ring-4 ring-surface",
					r.rank === 1 ? "bg-fill text-fg-inverse" : "bg-overlay text-fg",
				)}
			>
				{r.rank}
			</span>
			<span className="flex flex-col items-center text-xs tabular-nums">
				<span className="text-fg-secondary">{short(r.address)}</span>
				<span className={pnlClass(r.pnl)}>{signedUsd(r.pnl, true)}</span>
			</span>
		</div>
	);
}

function Line({ r, payout, you }: { r: Trader; payout: number | null; you?: boolean }) {
	return (
		<div
			className={cn(
				"grid h-8 flex-none items-center gap-3 border-b border-stroke-faint px-4 text-xs tabular-nums",
				COLS,
				you && "border-b-0 bg-control",
			)}
		>
			<span className={cn(r.rank <= 3 ? "text-fg" : "text-fg-muted")}>{r.rank.toLocaleString()}</span>
			<span className="flex items-center gap-2">
				{short(r.address)}
				{you && <span className="rounded-full bg-fill px-2 py-0.5 text-2xs font-medium text-fg-inverse">You</span>}
			</span>
			<span className="text-right text-fg-secondary">{usd(r.accountValue)}</span>
			<span className={cn("text-right", pnlClass(r.pnl))}>{signedUsd(r.pnl)}</span>
			<span className={cn("text-right", pnlClass(r.roi))}>{pct(r.roi)}</span>
			<span className="text-right">{payout === null ? <span className="text-fg-disabled">-</span> : usd(payout)}</span>
		</div>
	);
}
