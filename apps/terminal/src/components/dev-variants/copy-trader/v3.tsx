import { Button, Slider } from "@hypeterminal/ui";
import { CaretLeftIcon, CaretRightIcon, ClipboardTextIcon, UsersIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
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
	type Trader,
	topTraders,
	traderFromAddress,
	unlistedTrader,
	usd,
	type VariantProps,
} from "./data";

type Mode = "copy" | "basket";

const CARD_W = 264;
const GAP = 8;

export default function V3({ initial }: VariantProps) {
	const [mode, setMode] = useState<Mode>("copy");
	const [coin, setCoin] = useState<string>("BTC");
	const [lean, setLean] = useState<Lean>("all");
	const [index, setIndex] = useState(0);
	const [pasting, setPasting] = useState(false);
	const [address, setAddress] = useState("");
	const [extra, setExtra] = useState<Trader | null>(null);
	const [leverage, setLeverage] = useState(10);
	const [copying, setCopying] = useState<Trader | null>(() => (initial === "running" ? topTraders("BTC")[0] : null));
	const track = useRef<HTMLDivElement>(null);
	const list = [...(extra ? [extra] : []), ...topTraders(coin, lean, "score", 10)];
	const current = list[Math.min(index, list.length - 1)];

	function go(i: number) {
		const next = Math.max(0, Math.min(list.length - 1, i));
		track.current?.scrollTo({ left: next * (CARD_W + GAP), behavior: "smooth" });
	}

	function resetTo(fn: () => void) {
		fn();
		setIndex(0);
		track.current?.scrollTo({ left: 0 });
	}

	function usePasted() {
		if (!isAddress(address)) {
			toast.error("Enter a full 0x address.");
			return;
		}
		const t = traderFromAddress(address) ?? unlistedTrader(address.trim());
		resetTo(() => setExtra(t));
		setPasting(false);
		setAddress("");
	}

	if (copying)
		return (
			<div className="flex flex-col gap-4 px-3 pt-4 pb-4">
				<style>{"@keyframes ct3-in{from{opacity:0;transform:scale(.97)}}"}</style>
				<div className="flex animate-[ct3-in_200ms_ease-out] flex-col gap-4 rounded-12 bg-control p-4">
					<div className="flex items-center justify-between">
						<span className="text-2xs tracking-micro text-fg-muted uppercase">You copy</span>
						<span className="text-xs text-market-up">Live, day {echo.days}</span>
					</div>
					<span className="truncate text-base font-medium">{copying.name}</span>
					<div className="grid grid-cols-2 gap-1 text-center text-xs tabular-nums">
						<span className="py-1 text-2xs text-fg-muted">You</span>
						<span className="py-1 text-2xs text-fg-muted">Them</span>
						<Cell value={usd(echo.botPnl, true)} label="PNL" up />
						<Cell value={usd(echo.whalePnl, true)} label="PNL" up />
						<Cell value={count(echo.botTrades)} label="trades" />
						<Cell value={`~${count(echo.whaleTrades)}`} label="trades" />
						<Cell value={`${usd(echo.botFeesDay)}/day`} label="fees" />
						<Cell value={`${usd(echo.whaleFeesDay)}/day`} label="fees" />
						<Cell value={`${echo.botTurnoverDay}%/day`} label="turnover" />
						<Cell value={`${echo.whaleTurnoverDay}%/day`} label="turnover" />
					</div>
					<span className="text-2xs text-fg-muted">Per $100K. Max leverage {leverage}x.</span>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Button variant="secondary" intent="neutral" size="sm" onClick={() => toast.success("Copy trading paused.")}>
						Pause
					</Button>
					<Button
						variant="secondary"
						intent="neutral"
						size="sm"
						onClick={() => {
							setCopying(null);
							toast.success("Stopped copying. Positions stay open.");
						}}
					>
						Stop
					</Button>
				</div>
			</div>
		);

	return (
		<div className="flex flex-col gap-4 pt-4 pb-4">
			<div className="flex gap-4 px-3 text-sm">
				{(["copy", "basket"] as const).map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => setMode(m)}
						className={cn("font-medium transition-colors", mode === m ? "text-fg" : "text-fg-muted hover:text-fg")}
					>
						{m === "copy" ? "Copy a trader" : "Basket"}
					</button>
				))}
			</div>

			{mode === "basket" ? (
				<div className="px-3">
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
				</div>
			) : (
				<>
					<div className="flex items-center justify-between gap-2 px-3">
						<div className="flex gap-1">
							{COINS.map((c) => (
								<button
									key={c}
									type="button"
									aria-label={c}
									onClick={() => resetTo(() => setCoin(c))}
									className={cn(
										"grid size-7 place-items-center rounded-full transition-colors",
										coin === c ? "bg-control-hover" : "opacity-50 hover:opacity-100",
									)}
								>
									<AssetDisplay coin={c} hideName iconClassName="size-4" />
								</button>
							))}
						</div>
						<button
							type="button"
							onClick={() => setPasting((p) => !p)}
							className="inline-flex h-7 items-center gap-1 rounded-full bg-control px-2.5 text-xs text-fg-secondary hover:bg-control-hover"
						>
							<ClipboardTextIcon className="size-3.5" />
							Address
						</button>
					</div>

					{pasting && (
						<div className="mx-3 flex h-9 animate-[ct3-in_150ms_ease-out] items-center gap-2 rounded-8 bg-control pr-1 pl-3">
							<style>{"@keyframes ct3-in{from{opacity:0;transform:scale(.97)}}"}</style>
							<input
								value={address}
								onChange={(e) => setAddress(e.target.value)}
								placeholder="Paste a trader address"
								className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
							/>
							<button
								type="button"
								onClick={usePasted}
								className="h-7 rounded-6 bg-control-hover px-2.5 text-xs font-medium hover:bg-fill-hover"
							>
								Add
							</button>
						</div>
					)}

					<div className="flex items-center gap-1 px-3">
						{(["all", "bull", "bear"] as const).map((l) => (
							<button
								key={l}
								type="button"
								onClick={() => resetTo(() => setLean(l))}
								className={cn(
									"h-6 rounded-full px-2.5 text-xs transition-colors",
									lean === l ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary hover:bg-control-hover",
								)}
							>
								{l === "all" ? "Any lean" : `${LEAN_LABEL[l]} only`}
							</button>
						))}
						<span className="ml-auto text-xs text-fg-muted tabular-nums">
							{list.length ? index + 1 : 0}/{list.length}
						</span>
					</div>

					<div
						ref={track}
						onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / (CARD_W + GAP)))}
						className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 [scrollbar-width:none]"
						style={{ scrollPaddingInline: 12 }}
					>
						{list.map((t, i) => (
							<TraderCard key={t.address} t={t} active={i === index} onClick={() => go(i)} />
						))}
						{list.length === 0 && (
							<p className="w-full py-10 text-center text-xs text-fg-muted">No traders with this lean for {coin}.</p>
						)}
						<span className="w-1 shrink-0" />
					</div>

					<div className="flex items-center justify-center gap-3 px-3">
						<button
							type="button"
							aria-label="Previous trader"
							onClick={() => go(index - 1)}
							className="grid size-7 place-items-center rounded-full bg-control text-fg-secondary hover:bg-control-hover"
						>
							<CaretLeftIcon weight="bold" className="size-3" />
						</button>
						<div className="flex gap-1">
							{list.map((t, i) => (
								<span
									key={t.address}
									className={cn("h-1 rounded-full transition-all", i === index ? "w-4 bg-fg" : "w-1 bg-control-hover")}
								/>
							))}
						</div>
						<button
							type="button"
							aria-label="Next trader"
							onClick={() => go(index + 1)}
							className="grid size-7 place-items-center rounded-full bg-control text-fg-secondary hover:bg-control-hover"
						>
							<CaretRightIcon weight="bold" className="size-3" />
						</button>
					</div>

					<div className="flex flex-col gap-2 px-3">
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
					</div>

					<div className="px-3">
						<Button
							variant="filled"
							intent="brand"
							size="md"
							className="w-full"
							disabled={!current}
							onClick={() => {
								if (!current) return;
								setCopying(current);
								toast.success(`Copying ${current.name}. Max leverage ${leverage}x.`);
							}}
						>
							{current ? `Copy ${current.name}` : "Pick a trader"}
						</Button>
					</div>
				</>
			)}
		</div>
	);
}

function TraderCard({ t, active, onClick }: { t: Trader; active: boolean; onClick: () => void }) {
	const side = leanOf(t.lean);
	const unrated = t.grade === "Unrated";
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex shrink-0 snap-start flex-col gap-3 rounded-12 p-4 text-left transition-colors",
				active ? "bg-control-hover" : "bg-control",
			)}
			style={{ width: CARD_W }}
		>
			<span className="flex items-start justify-between gap-2">
				<span className="flex min-w-0 flex-col">
					<span className="truncate text-sm font-medium">{t.name}</span>
					<span className="text-2xs text-fg-muted">{unrated ? "Not on the leaderboard" : t.grade}</span>
				</span>
				<span className="inline-flex shrink-0 items-center gap-1 text-xs text-fg-secondary">
					<UsersIcon className="size-3.5" />
					{count(t.followers)}
				</span>
			</span>

			<span className="flex items-end gap-3">
				<span className="text-2xl leading-none font-semibold tabular-nums">{unrated ? "New" : t.score}</span>
				<span className="flex flex-1 flex-col gap-1 pb-0.5">
					<span className="flex h-1.5 gap-px overflow-hidden rounded-full bg-surface">
						<span className="bg-fg" style={{ width: `${t.parts.track}%` }} />
						<span className="bg-fg-secondary" style={{ width: `${t.parts.windows}%` }} />
						<span className="bg-fg-muted" style={{ width: `${t.parts.returns}%` }} />
					</span>
					<span className="flex justify-between text-2xs text-fg-muted tabular-nums">
						<span>Track {t.parts.track}/50</span>
						<span>Windows {t.parts.windows}/30</span>
						<span>ROI {t.parts.returns}/20</span>
					</span>
				</span>
			</span>

			<Spark path={t.path} />

			<span className="grid grid-cols-3 gap-2 text-xs tabular-nums">
				<span className="flex flex-col gap-0.5">
					<span className="text-2xs text-fg-muted">30d PNL</span>
					<span className={t.month.pnl >= 0 ? "text-market-up" : "text-market-down"}>{usd(t.month.pnl, true)}</span>
				</span>
				<span className="flex flex-col gap-0.5">
					<span className="text-2xs text-fg-muted">All time</span>
					<span className={t.allTime.pnl >= 0 ? "text-market-up" : "text-market-down"}>{usd(t.allTime.pnl, true)}</span>
				</span>
				<span className="flex flex-col gap-0.5">
					<span className="text-2xs text-fg-muted">Lean</span>
					<span className={cn(side === "bull" && "text-market-up", side === "bear" && "text-market-down")}>
						{unrated ? "Unknown" : LEAN_LABEL[side]}
					</span>
				</span>
			</span>
		</button>
	);
}

function Spark({ path }: { path: number[] }) {
	const w = 232;
	const h = 40;
	const min = Math.min(...path);
	const max = Math.max(...path);
	const span = max - min || 1;
	const pts = path.map((v, i) => [(i / (path.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)]);
	const up = path[path.length - 1] >= path[0];
	return (
		<span className="flex flex-col gap-1">
			<svg
				viewBox={`0 0 ${w} ${h}`}
				className={cn("h-10 w-full", up ? "text-market-up" : "text-market-down")}
				aria-hidden="true"
			>
				<polyline
					points={pts.map((p) => p.join(",")).join(" ")}
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinejoin="round"
				/>
				{pts.map(([x, y]) => (
					<circle key={x} cx={x} cy={y} r="2" fill="currentColor" />
				))}
			</svg>
			<span className="flex justify-between text-2xs text-fg-muted">
				<span>Start</span>
				<span>30d</span>
				<span>7d</span>
				<span>1d</span>
				<span>Now</span>
			</span>
		</span>
	);
}

function Cell({ value, label, up }: { value: string; label: string; up?: boolean }) {
	return (
		<span className="flex flex-col rounded-8 bg-control-hover py-2">
			<span className={cn(up && "text-market-up")}>{value}</span>
			<span className="text-2xs text-fg-muted">{label}</span>
		</span>
	);
}
