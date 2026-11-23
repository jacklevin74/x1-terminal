import { Button, Slider } from "@hypeterminal/ui";
import { PauseIcon, PlayIcon, UsersIcon } from "@phosphor-icons/react";
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
	type Grade,
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

export default function V1({ initial }: VariantProps) {
	const [mode, setMode] = useState<Mode>("copy");
	const [coin, setCoin] = useState<string>("BTC");
	const [lean, setLean] = useState<Lean>("all");
	const [picked, setPicked] = useState<Trader>(() => topTraders("BTC")[0]);
	const [address, setAddress] = useState("");
	const [leverage, setLeverage] = useState(10);
	const [running, setRunning] = useState(initial === "running");
	const [paused, setPaused] = useState(false);
	const list = topTraders(coin, lean, "score", 8);

	function usePasted() {
		if (!isAddress(address)) {
			toast.error("Enter a full 0x address.");
			return;
		}
		const t = traderFromAddress(address) ?? unlistedTrader(address.trim());
		setPicked(t);
		setAddress("");
		toast.success(`Selected ${t.name}.`);
	}

	function start() {
		setRunning(true);
		setPaused(false);
		toast.success(`Copying ${picked.name}. Max leverage ${leverage}x.`);
	}

	if (running)
		return (
			<div className="flex animate-[ct-in_200ms_ease-out] flex-col gap-4 px-3 pt-4 pb-4">
				<style>{"@keyframes ct-in{from{opacity:0;transform:scale(.97)}}"}</style>
				<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
					<div className="flex items-center gap-3">
						<span
							className={cn(
								"grid size-9 shrink-0 place-items-center rounded-full bg-control-hover",
								paused ? "text-fg-muted" : "text-market-up",
							)}
						>
							{paused ? <PauseIcon weight="fill" className="size-4" /> : <PlayIcon weight="fill" className="size-4" />}
						</span>
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="text-2xs tracking-micro text-fg-muted uppercase">Copying</span>
							<span className="truncate text-sm font-medium">{picked.name}</span>
							<span className="text-xs text-fg-muted">
								{paused ? "Paused" : "Live"}, day {echo.days}, max {leverage}x
							</span>
						</span>
						<button
							type="button"
							onClick={() => {
								setPaused((p) => !p);
								toast.success(paused ? "Copy trading resumed." : "Copy trading paused.");
							}}
							className={cn(
								"h-8 shrink-0 rounded-full px-3.5 text-xs font-medium transition-colors",
								paused ? "bg-fill text-fg-inverse hover:opacity-90" : "bg-control-hover text-fg hover:bg-fill-hover",
							)}
						>
							{paused ? "Start" : "Pause"}
						</button>
					</div>
					<div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-xs tabular-nums">
						<span className="text-2xs text-fg-muted" />
						<span className="text-right text-2xs text-fg-muted">You</span>
						<span className="text-right text-2xs text-fg-muted">Them</span>
						<CompareRow
							label="PNL on $100K"
							you={usd(echo.botPnl, true)}
							them={usd(echo.whalePnl, true)}
							youClass="text-market-up"
							themClass="text-market-up"
						/>
						<CompareRow label="Trades" you={count(echo.botTrades)} them={`~${count(echo.whaleTrades)}`} />
						<CompareRow label="Fees a day" you={usd(echo.botFeesDay)} them={usd(echo.whaleFeesDay)} />
						<CompareRow label="Turnover a day" you={`${echo.botTurnoverDay}%`} them={`${echo.whaleTurnoverDay}%`} />
					</div>
				</div>
				<p className="text-xs text-fg-muted">
					The bot skips small trades and follows the trends that win. You save{" "}
					{usd((echo.whaleFeesDay - echo.botFeesDay) * echo.days)} in fees over {echo.days} days.
				</p>
				<button
					type="button"
					onClick={() => {
						setRunning(false);
						toast.success("Stopped copying. Positions stay open.");
					}}
					className="self-start text-xs text-fg-secondary hover:text-fg"
				>
					Stop copying
				</button>
			</div>
		);

	return (
		<div className="flex flex-col gap-4 px-3 pt-4 pb-4">
			<div className="grid grid-cols-2 gap-1 rounded-8 bg-control p-1 text-xs">
				{(["copy", "basket"] as const).map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => setMode(m)}
						className={cn(
							"h-7 rounded-6 transition-colors",
							mode === m ? "bg-control-hover font-medium text-fg" : "text-fg-muted hover:text-fg",
						)}
					>
						{m === "copy" ? "Copy a trader" : "Basket (mood ring)"}
					</button>
				))}
			</div>

			{mode === "basket" ? (
				<div className="flex flex-col gap-3">
					<AutoStatusCard
						on={false}
						title="Basket ready"
						subtitle="Follows the mood ring of 37 traders"
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
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between text-xs">
							<span className="text-fg-muted">Top traders for</span>
							<div className="flex gap-1 rounded-8 bg-control p-0.5">
								{(["all", "bull", "bear"] as const).map((l) => (
									<button
										key={l}
										type="button"
										onClick={() => setLean(l)}
										className={cn(
											"h-6 rounded-6 px-2 text-xs transition-colors",
											lean === l ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
										)}
									>
										{l === "all" ? "All" : LEAN_LABEL[l]}
									</button>
								))}
							</div>
						</div>
						<div className="-mx-3 flex gap-1 overflow-x-auto px-3 [scrollbar-width:none]">
							{COINS.map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => setCoin(c)}
									className={cn(
										"flex h-7 shrink-0 items-center gap-1 rounded-full pr-2.5 pl-1.5 text-xs transition-colors",
										coin === c ? "bg-control-hover text-fg" : "bg-control text-fg-muted hover:text-fg",
									)}
								>
									<AssetDisplay coin={c} hideName iconClassName="size-3.5" />
									{c}
								</button>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-1">
						{list.length === 0 && (
							<p className="py-6 text-center text-xs text-fg-muted">No traders with this lean for {coin}.</p>
						)}
						{list.map((t) => (
							<TraderRow key={t.address} t={t} on={t.address === picked.address} onPick={() => setPicked(t)} />
						))}
					</div>

					<div className="flex h-9 items-center gap-2 rounded-8 bg-control pr-1 pl-3">
						<input
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder="Or paste a trader address"
							className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
						/>
						<button
							type="button"
							onClick={usePasted}
							disabled={!address}
							className="h-7 rounded-6 bg-control-hover px-2.5 text-xs font-medium hover:bg-fill-hover disabled:opacity-50"
						>
							Use
						</button>
					</div>

					<div className="flex flex-col gap-2">
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

					<Button variant="filled" intent="brand" size="md" onClick={start}>
						Copy {picked.name}
					</Button>
				</>
			)}
		</div>
	);
}

const GRADE_CLASS: Record<Grade, string> = {
	Consistent: "text-market-up",
	Mixed: "text-fg-secondary",
	"One big run": "text-fg-muted",
	Losing: "text-market-down",
	Unrated: "text-fg-muted",
};

function TraderRow({ t, on, onPick }: { t: Trader; on: boolean; onPick: () => void }) {
	const side = leanOf(t.lean);
	return (
		<button
			type="button"
			onClick={onPick}
			className={cn(
				"flex items-center gap-3 rounded-8 px-2.5 py-2 text-left transition-colors",
				on ? "bg-control-hover" : "hover:bg-control",
			)}
		>
			<span className="flex w-9 shrink-0 flex-col items-center rounded-6 bg-control py-1">
				<span className="text-sm font-semibold tabular-nums">{t.score}</span>
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="flex items-center gap-2 text-xs">
					<span className="truncate font-medium">{t.name}</span>
					<span className={cn("shrink-0 text-2xs", GRADE_CLASS[t.grade])}>{t.grade}</span>
				</span>
				<span className="flex items-center gap-2 text-2xs text-fg-muted">
					<span className={cn(side === "bull" && "text-market-up", side === "bear" && "text-market-down")}>
						{LEAN_LABEL[side]}
					</span>
					<span className="inline-flex items-center gap-0.5">
						<UsersIcon className="size-3" />
						{count(t.followers)}
					</span>
				</span>
			</span>
			<span className="flex shrink-0 flex-col items-end gap-0.5 text-xs tabular-nums">
				<span className={t.month.pnl >= 0 ? "text-market-up" : "text-market-down"}>{usd(t.month.pnl, true)}</span>
				<span className="text-2xs text-fg-muted">30d</span>
			</span>
		</button>
	);
}

function CompareRow({
	label,
	you,
	them,
	youClass,
	themClass,
}: {
	label: string;
	you: string;
	them: string;
	youClass?: string;
	themClass?: string;
}) {
	return (
		<>
			<span className="text-fg-muted">{label}</span>
			<span className={cn("text-right", youClass)}>{you}</span>
			<span className={cn("text-right text-fg-secondary", themClass)}>{them}</span>
		</>
	);
}
