import { Button } from "@hypeterminal/ui";
import { cn } from "@/lib/cn";
import { ConsistencyChart } from "./consistency-chart";
import {
	count,
	type DegenParts,
	type DirTrader,
	degenLabel,
	hypeSide,
	MOOD_MARKET,
	pnlTone,
	tradesText,
	usd,
	WINDOW_LABEL,
	type Window,
} from "./data";
import { EnterKeyframes } from "./enter-keyframes";
import { Identicon } from "./identicon";

const WINDOWS: Window[] = ["d7", "d30", "all"];

const PART_LABEL: Record<keyof DegenParts, string> = {
	size: "Position size",
	leverage: "Leverage",
	swing: "Biggest swing",
	concentration: "PNL in one period",
	fewTrades: "Few trades",
};

interface Props {
	t: DirTrader;
	actionLabel: string;
	actionDisabled?: boolean;
	onAction: () => void;
}

export function TraderDetail({ t, actionLabel, actionDisabled, onAction }: Props) {
	return (
		<div className="@container flex animate-[auto-copy-in_160ms_ease-out] flex-col gap-4 rounded-12 bg-control p-4">
			<EnterKeyframes />
			<div className="flex items-center gap-3">
				<Identicon id={t.id} className="size-11" />
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm font-medium">{t.name}</span>
					<span className="truncate text-2xs text-fg-muted">{t.style ?? `${t.id.slice(0, 10)}…${t.id.slice(-6)}`}</span>
				</span>
				<span className="text-right text-2xs text-fg-muted">
					<span className="block text-xs text-fg tabular-nums">{usd(t.equity)}</span>
					equity
				</span>
			</div>
			<div className="grid grid-cols-3 gap-2">
				{WINDOWS.map((w) => (
					<span key={w} className="flex flex-col gap-0.5 rounded-8 bg-control-hover px-3 py-2">
						<span className="text-2xs text-fg-muted">PNL {WINDOW_LABEL[w]}</span>
						<span className={cn("text-xs font-medium tabular-nums", pnlTone(t.pnl[w]))}>{usd(t.pnl[w], true)}</span>
					</span>
				))}
			</div>
			<ConsistencyChart t={t} />
			<div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<span className="flex items-baseline justify-between text-xs">
						<span className="text-fg-muted">Degen score</span>
						<span className="tabular-nums">
							{t.degen} <span className="text-fg-muted">{degenLabel(t.degen)}</span>
						</span>
					</span>
					{(Object.keys(PART_LABEL) as (keyof DegenParts)[]).map((k) => {
						const v = t.degenParts[k];
						return (
							<span key={k} className="grid grid-cols-[110px_1fr_32px] items-center gap-2 text-2xs">
								<span className="text-fg-muted">{PART_LABEL[k]}</span>
								<Meter value={v} />
								<span className="text-right tabular-nums">{v === null ? "n/a" : Math.round(v * 100)}</span>
							</span>
						);
					})}
				</div>
				<div className="flex flex-col gap-2">
					<span className="text-xs text-fg-muted">Activity</span>
					<span className="flex justify-between text-2xs">
						<span className="text-fg-muted">Trades a day (14d)</span>
						<span className="tabular-nums">{tradesText(t)}</span>
					</span>
					<span className="flex justify-between text-2xs">
						<span className="text-fg-muted">Max leverage</span>
						<span className="tabular-nums">{t.maxLev === null ? "n/a" : `${t.maxLev}x`}</span>
					</span>
					<span className="flex justify-between text-2xs">
						<span className="text-fg-muted">Side {MOOD_MARKET}</span>
						<span className="tabular-nums">{hypeSide(t.id) ?? "None"}</span>
					</span>
					<span className="flex justify-between text-2xs">
						<span className="text-fg-muted">Followers (example)</span>
						<span className="tabular-nums">{count(t.followers)}</span>
					</span>
				</div>
			</div>
			{t.positions.length > 0 && (
				<div className="flex flex-col gap-1">
					<span className="text-2xs text-fg-muted">Open positions ({t.positions.length})</span>
					{t.positions.slice(0, 4).map((p) => (
						<span key={p.coin} className="grid grid-cols-[1fr_48px_72px_72px] text-2xs tabular-nums">
							<span className="truncate">{p.coin.replace(/^xyz:/, "")}</span>
							<span className={p.szi > 0 ? "text-market-up" : "text-market-down"}>{p.szi > 0 ? "Long" : "Short"}</span>
							<span className="text-right">{usd(p.ntl)}</span>
							<span className="text-right text-fg-muted">{p.lev}</span>
						</span>
					))}
				</div>
			)}
			<Button variant="filled" intent="brand" size="sm" disabled={actionDisabled} onClick={onAction}>
				{actionLabel}
			</Button>
		</div>
	);
}

function Meter({ value }: { value: number | null }) {
	return (
		<span className="h-1.5 rounded-full bg-control-hover">
			{value !== null && (
				<span
					className="block h-full rounded-full bg-fg-secondary"
					style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }}
				/>
			)}
		</span>
	);
}
