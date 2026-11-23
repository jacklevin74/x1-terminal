import { Button, Slider } from "@hypeterminal/ui";
import { CaretRightIcon, UsersIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { AutoStatusCard } from "@/components/trade/auto/auto-status-card";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import {
	basketMarkets,
	COINS,
	count,
	echo,
	isAddress,
	LEAN_LABEL,
	LEVERAGE_MARKS,
	type Lean,
	leanOf,
	PATH_LABELS,
	pct,
	shortAddr,
	type Trader,
	topTraders,
	traderFromAddress,
	unlistedTrader,
	usd,
	type VariantProps,
} from "./data";

type Mode = "copy" | "basket";
const ANIM =
	"@keyframes ct5-in{from{opacity:0;transform:scale(.97)}}@keyframes ct5-up{from{transform:translateY(24px) scale(.97);opacity:0}}";

export default function V5({ initial }: VariantProps) {
	const [mode, setMode] = useState<Mode>("copy");
	const [coin, setCoin] = useState<string>("BTC");
	const [lean, setLean] = useState<Lean>("all");
	const [address, setAddress] = useState("");
	const [sheet, setSheet] = useState<Trader | null>(null);
	const [running, setRunning] = useState<{ t: Trader; leverage: number } | null>(() =>
		initial === "running" ? { t: topTraders("BTC")[0], leverage: 10 } : null,
	);
	const list = topTraders(coin, lean, "score", 9);

	function openPasted() {
		if (!isAddress(address)) {
			toast.error("Enter a full 0x address.");
			return;
		}
		setSheet(traderFromAddress(address) ?? unlistedTrader(address.trim()));
		setAddress("");
	}

	return (
		<div className="relative flex min-h-[700px] flex-col">
			<style>{ANIM}</style>
			{running ? (
				<Running
					t={running.t}
					leverage={running.leverage}
					onProfile={() => setSheet(running.t)}
					onStop={() => {
						setRunning(null);
						toast.success("Stopped copying. Positions stay open.");
					}}
				/>
			) : (
				<div className="flex flex-col gap-4 px-3 pt-4 pb-4">
					<div className="flex gap-1">
						{(["copy", "basket"] as const).map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => setMode(m)}
								className={cn(
									"h-7 rounded-full px-3 text-xs transition-colors",
									mode === m ? "bg-control-hover font-medium text-fg" : "text-fg-muted hover:text-fg",
								)}
							>
								{m === "copy" ? "Copy a trader" : "Basket (mood ring)"}
							</button>
						))}
					</div>

					{mode === "basket" ? (
						<AutoStatusCard
							on={false}
							title="Basket ready"
							subtitle="Mood ring of 37 traders"
							equity="$100,000"
							markets={basketMarkets}
							actionLabel="Start"
							busy={false}
							disabled={false}
							onToggle={() => toast.success("Basket mode started.")}
							onMarkets={() => {}}
						/>
					) : (
						<>
							<div className="flex items-center gap-2">
								<div className="-mx-3 flex flex-1 gap-1 overflow-x-auto px-3 [scrollbar-width:none]">
									{COINS.map((c) => (
										<button
											key={c}
											type="button"
											onClick={() => setCoin(c)}
											className={cn(
												"inline-flex h-7 shrink-0 items-center gap-1 rounded-full pr-2.5 pl-1 text-xs transition-colors",
												coin === c ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
											)}
										>
											<AssetDisplay coin={c} hideName iconClassName="size-5" />
											{c}
										</button>
									))}
								</div>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-fg-muted">Top {coin} traders</span>
								<div className="flex gap-3">
									{(["all", "bull", "bear"] as const).map((l) => (
										<button
											key={l}
											type="button"
											onClick={() => setLean(l)}
											className={cn("transition-colors", lean === l ? "text-fg" : "text-fg-muted hover:text-fg")}
										>
											{l === "all" ? "All" : LEAN_LABEL[l]}
										</button>
									))}
								</div>
							</div>
							<div className="flex flex-col overflow-hidden rounded-12 bg-control">
								{list.map((t) => (
									<button
										key={t.address}
										type="button"
										onClick={() => setSheet(t)}
										className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-control-hover"
									>
										<ScoreRing score={t.score} />
										<span className="flex min-w-0 flex-1 flex-col">
											<span className="truncate text-xs font-medium">{t.name}</span>
											<span className="text-2xs text-fg-muted">
												{t.grade}, {count(t.followers)} followers
											</span>
										</span>
										<span
											className={cn("text-xs tabular-nums", t.month.pnl >= 0 ? "text-market-up" : "text-market-down")}
										>
											{usd(t.month.pnl, true)}
										</span>
										<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
									</button>
								))}
								{list.length === 0 && (
									<p className="py-8 text-center text-xs text-fg-muted">No traders with this lean for {coin}.</p>
								)}
							</div>
							<div className="flex h-9 items-center gap-2 rounded-8 bg-control pr-1 pl-3">
								<input
									value={address}
									onChange={(e) => setAddress(e.target.value)}
									placeholder="Paste an address to open a profile"
									className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
								/>
								<button
									type="button"
									onClick={openPasted}
									disabled={!address}
									className="h-7 rounded-6 bg-control-hover px-2.5 text-xs font-medium hover:bg-fill-hover disabled:opacity-50"
								>
									Open
								</button>
							</div>
						</>
					)}
				</div>
			)}

			{sheet && (
				<Sheet
					t={sheet}
					copying={running?.t.address === sheet.address}
					onClose={() => setSheet(null)}
					onCopy={(leverage) => {
						setRunning({ t: sheet, leverage });
						setSheet(null);
						toast.success(`Copying ${sheet.name}. Max leverage ${leverage}x.`);
					}}
				/>
			)}
		</div>
	);
}

function Sheet({
	t,
	copying,
	onClose,
	onCopy,
}: {
	t: Trader;
	copying: boolean;
	onClose: () => void;
	onCopy: (leverage: number) => void;
}) {
	const [leverage, setLeverage] = useState(10);
	const unrated = t.grade === "Unrated";
	const side = leanOf(t.lean);
	return (
		<>
			<button type="button" aria-label="Close profile" onClick={onClose} className="absolute inset-0 bg-scrim" />
			<div className="absolute inset-x-0 top-6 bottom-0 flex animate-[ct5-up_220ms_ease-out] flex-col rounded-t-12 bg-overlay shadow-menu">
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-2">
					<div className="flex items-start gap-3 px-4 pt-4">
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="truncate text-base font-medium">{t.name}</span>
							{t.displayName && <span className="text-xs text-fg-muted">{shortAddr(t.address)}</span>}
							<span className="text-xs text-fg-muted">
								{t.grade === "Unrated" ? "Pasted address" : `Score ${t.score}, ${t.grade.toLowerCase()}`}
							</span>
						</span>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							className="grid size-8 place-items-center rounded-8 bg-control text-fg-secondary hover:bg-control-hover"
						>
							<XIcon weight="bold" className="size-3.5" />
						</button>
					</div>

					{unrated ? (
						<p className="px-4 py-6 text-xs text-fg-muted">
							This address is not in the leaderboard snapshot. The score and PNL show after its history loads.
						</p>
					) : (
						<div className="flex flex-col gap-4 px-4 pt-4">
							<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
								<span className="inline-flex items-center gap-1 text-fg-secondary">
									<UsersIcon className="size-3.5" />
									{count(t.followers)} followers
								</span>
								<span className={cn(side === "bull" && "text-market-up", side === "bear" && "text-market-down")}>
									{LEAN_LABEL[side]} lean
								</span>
								<span className="text-fg-muted">Equity {usd(t.accountValue)}</span>
							</div>

							<PathChart path={t.path} />

							<div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
								<Stat label="7d PNL" value={usd(t.week.pnl, true)} up={t.week.pnl >= 0} />
								<Stat label="30d PNL" value={usd(t.month.pnl, true)} up={t.month.pnl >= 0} />
								<Stat label="All-time ROI" value={pct(t.allTime.roi)} up={t.allTime.roi >= 0} />
							</div>

							<div className="flex flex-col gap-3 rounded-12 bg-control p-3">
								<div className="flex items-baseline justify-between">
									<span className="text-xs text-fg-muted">Consistency score</span>
									<span className="text-sm font-semibold tabular-nums">
										{t.score} <span className="font-normal text-fg-muted">{t.grade}</span>
									</span>
								</div>
								<Part
									label="Track record"
									value={t.parts.track}
									max={50}
									note={`${Math.round((1 - t.recentShare) * 100)}% of all-time PNL made before the last 30 days`}
								/>
								<Part
									label="Windows in profit"
									value={t.parts.windows}
									max={30}
									note={`${t.parts.windows / 10} of 3 (week, month, all time)`}
								/>
								<Part label="Returns" value={t.parts.returns} max={20} note={`All-time ROI ${pct(t.allTime.roi)}`} />
							</div>
							<p className="text-xs text-fg-muted">
								Trades {t.turnoverDay < 1 ? "under 1" : Math.round(t.turnoverDay)}% of equity a day. The bot skips the
								noise and copies the trends.
							</p>
						</div>
					)}
				</div>
				<div className="flex shrink-0 flex-col gap-3 px-4 pt-3 pb-4">
					<div className="flex items-center justify-between text-xs">
						<span className="text-fg-muted">Max leverage</span>
						<span className="tabular-nums">{leverage}x</span>
					</div>
					<Slider
						value={leverage}
						onValueChange={(v) => setLeverage(Array.isArray(v) ? v[0] : v)}
						min={1}
						max={40}
						step={1}
						marks={LEVERAGE_MARKS}
						onMarkSelect={setLeverage}
					/>
					<Button variant="filled" intent="brand" size="md" disabled={copying} onClick={() => onCopy(leverage)}>
						{copying ? "You copy this trader" : "Copy trader"}
					</Button>
				</div>
			</div>
		</>
	);
}

function Running({
	t,
	leverage,
	onProfile,
	onStop,
}: {
	t: Trader;
	leverage: number;
	onProfile: () => void;
	onStop: () => void;
}) {
	const youDots = Math.round(echo.botTrades / 25);
	const themDots = Math.round(echo.whaleTrades / 25);
	return (
		<div className="flex animate-[ct5-in_200ms_ease-out] flex-col gap-4 px-3 pt-4 pb-4">
			<button
				type="button"
				onClick={onProfile}
				className="flex items-center gap-3 rounded-12 bg-control p-3 text-left transition-colors hover:bg-control-hover"
			>
				<ScoreRing score={t.score} />
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-xs font-medium">Copying {t.name}</span>
					<span className="text-2xs text-market-up">Live, max {leverage}x</span>
				</span>
				<span className="text-xs text-fg-secondary">Profile</span>
				<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
			</button>

			<div className="grid grid-cols-2 gap-2">
				<div className="flex flex-col gap-0.5 rounded-12 bg-control p-3">
					<span className="text-2xs text-fg-muted">You</span>
					<span className="text-base font-semibold text-market-up tabular-nums">{usd(echo.botPnl, true)}</span>
				</div>
				<div className="flex flex-col gap-0.5 rounded-12 bg-control p-3">
					<span className="text-2xs text-fg-muted">Them</span>
					<span className="text-base font-semibold text-fg-secondary tabular-nums">{usd(echo.whalePnl, true)}</span>
				</div>
			</div>

			<div className="flex flex-col gap-3 rounded-12 bg-control p-3 text-xs">
				<span className="text-fg-muted">Trades in {echo.days} days (1 dot = 25 trades)</span>
				<DotRow label="You" n={youDots} value={count(echo.botTrades)} strong />
				<DotRow label="Them" n={themDots} value={`~${count(echo.whaleTrades)}`} />
				<div className="grid grid-cols-2 gap-2 pt-1 tabular-nums">
					<span className="flex flex-col">
						<span className="text-2xs text-fg-muted">Fees a day</span>
						<span>
							{usd(echo.botFeesDay)} <span className="text-fg-muted">vs {usd(echo.whaleFeesDay)}</span>
						</span>
					</span>
					<span className="flex flex-col">
						<span className="text-2xs text-fg-muted">Turnover a day</span>
						<span>
							{echo.botTurnoverDay}% <span className="text-fg-muted">vs {echo.whaleTurnoverDay}%</span>
						</span>
					</span>
				</div>
			</div>
			<p className="text-2xs text-fg-muted">Per $100K deposited.</p>

			<div className="grid grid-cols-2 gap-2">
				<Button variant="secondary" intent="neutral" size="sm" onClick={() => toast.success("Copy trading paused.")}>
					Pause
				</Button>
				<Button variant="secondary" intent="neutral" size="sm" onClick={onStop}>
					Stop copying
				</Button>
			</div>
		</div>
	);
}

function DotRow({ label, n, value, strong }: { label: string; n: number; value: string; strong?: boolean }) {
	return (
		<div className="grid grid-cols-[36px_1fr_44px] items-start gap-2 tabular-nums">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className="flex flex-wrap gap-[3px] pt-1">
				{Array.from({ length: n }, (_, i) => `${label}-${i}`).map((id) => (
					<span key={id} className={cn("size-1.5 rounded-full", strong ? "bg-fg" : "bg-fg-muted")} />
				))}
			</span>
			<span className="text-right">{value}</span>
		</div>
	);
}

function ScoreRing({ score }: { score: number }) {
	const r = 14;
	const c = 2 * Math.PI * r;
	return (
		<span className="relative grid size-9 shrink-0 place-items-center">
			<svg viewBox="0 0 36 36" className="absolute inset-0 size-9 -rotate-90" aria-hidden="true">
				<circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" className="stroke-control-hover" />
				<circle
					cx="18"
					cy="18"
					r={r}
					fill="none"
					strokeWidth="3"
					strokeLinecap="round"
					strokeDasharray={`${(score / 100) * c} ${c}`}
					className="stroke-fg"
				/>
			</svg>
			<span className="text-2xs font-semibold tabular-nums">{score}</span>
		</span>
	);
}

function PathChart({ path }: { path: number[] }) {
	const w = 280;
	const h = 96;
	const min = Math.min(0, ...path);
	const max = Math.max(...path);
	const span = max - min || 1;
	const y = (v: number) => 6 + (1 - (v - min) / span) * (h - 12);
	const pts = path.map((v, i) => [8 + (i / (path.length - 1)) * (w - 16), y(v)] as const);
	const up = path[path.length - 1] >= 0;
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-baseline justify-between text-xs">
				<span className="text-fg-muted">All-time PNL path</span>
				<span className={cn("tabular-nums", up ? "text-market-up" : "text-market-down")}>
					{usd(path[path.length - 1], true)}
				</span>
			</div>
			<svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" aria-hidden="true">
				<line x1="0" x2={w} y1={y(0)} y2={y(0)} strokeDasharray="2 3" className="stroke-fg-disabled" />
				<polyline
					points={pts.map((p) => p.join(",")).join(" ")}
					fill="none"
					strokeWidth="2"
					strokeLinejoin="round"
					className={up ? "stroke-market-up" : "stroke-market-down"}
				/>
				{pts.map(([px, py]) => (
					<circle key={px} cx={px} cy={py} r="2.5" className={up ? "fill-market-up" : "fill-market-down"} />
				))}
			</svg>
			<div className="flex justify-between text-2xs text-fg-muted">
				{PATH_LABELS.map((l) => (
					<span key={l}>{l}</span>
				))}
			</div>
		</div>
	);
}

function Part({ label, value, max, note }: { label: string; value: number; max: number; note: string }) {
	return (
		<div className="flex flex-col gap-1 text-xs">
			<div className="flex justify-between">
				<span>{label}</span>
				<span className="text-fg-muted tabular-nums">
					{value}/{max}
				</span>
			</div>
			<span className="h-1 rounded-full bg-control-hover">
				<span className="block h-full rounded-full bg-fg-secondary" style={{ width: `${(value / max) * 100}%` }} />
			</span>
			<span className="text-2xs text-fg-muted">{note}</span>
		</div>
	);
}

function Stat({ label, value, up }: { label: string; value: string; up: boolean }) {
	return (
		<div className="flex flex-col gap-0.5 rounded-8 bg-control px-2.5 py-2">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={up ? "text-market-up" : "text-market-down"}>{value}</span>
		</div>
	);
}
