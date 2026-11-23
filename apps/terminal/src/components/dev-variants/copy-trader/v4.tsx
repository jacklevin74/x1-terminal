import { Button, Slider } from "@hypeterminal/ui";
import { CheckIcon, UsersIcon } from "@phosphor-icons/react";
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
	type Trader,
	topTraders,
	traderFromAddress,
	unlistedTrader,
	usd,
	type VariantProps,
} from "./data";

type Mode = "copy" | "basket";
const STEPS = ["Coin", "Trader", "Leverage", "Start"] as const;

export default function V4({ initial }: VariantProps) {
	const [mode, setMode] = useState<Mode>("copy");
	const [step, setStep] = useState(0);
	const [coin, setCoin] = useState<string>("BTC");
	const [lean, setLean] = useState<Lean>("all");
	const [picked, setPicked] = useState<Trader | null>(null);
	const [address, setAddress] = useState("");
	const [leverage, setLeverage] = useState(10);
	const [running, setRunning] = useState<Trader | null>(() => (initial === "running" ? topTraders("BTC")[0] : null));
	const canNext = step !== 1 || !!picked;

	function usePasted() {
		if (!isAddress(address)) {
			toast.error("Enter a full 0x address.");
			return;
		}
		setPicked(traderFromAddress(address) ?? unlistedTrader(address.trim()));
		setAddress("");
		setStep(2);
	}

	if (running)
		return (
			<div className="flex flex-col gap-4 px-3 pt-4 pb-4">
				<style>{"@keyframes ct4-in{from{opacity:0;transform:scale(.97)}}"}</style>
				<div className="flex animate-[ct4-in_200ms_ease-out] flex-col gap-3">
					<div className="flex items-center gap-3 rounded-12 bg-control p-4">
						<AssetDisplay coin={coin} hideName iconClassName="size-8" />
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="truncate text-sm font-medium">{running.name}</span>
							<span className="text-xs text-market-up">Copy trading live, max {leverage}x</span>
						</span>
						<Button
							variant="secondary"
							intent="neutral"
							size="xs"
							className="bg-control-hover hover:bg-fill-hover"
							onClick={() => toast.success("Copy trading paused.")}
						>
							Pause
						</Button>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<Tile label="Your PNL" value={usd(echo.botPnl, true)} sub={`Them ${usd(echo.whalePnl, true)}`} up />
						<Tile label="Trades" value={count(echo.botTrades)} sub={`Them ~${count(echo.whaleTrades)}`} />
						<Tile label="Fees a day" value={usd(echo.botFeesDay)} sub={`Them ${usd(echo.whaleFeesDay)}`} />
						<Tile label="Turnover a day" value={`${echo.botTurnoverDay}%`} sub={`Them ${echo.whaleTurnoverDay}%`} />
					</div>
					<p className="text-xs text-fg-muted">
						Per $100K over {echo.days} days. Same trend, fewer trades, lower fees.
					</p>
				</div>
				<button
					type="button"
					onClick={() => {
						setRunning(null);
						setStep(0);
						toast.success("Stopped copying. Positions stay open.");
					}}
					className="self-start text-xs text-fg-secondary hover:text-fg"
				>
					Stop and pick again
				</button>
			</div>
		);

	return (
		<div className="flex flex-col gap-4 px-3 pt-4 pb-4">
			<div className="flex items-center justify-between text-xs">
				<span className="text-fg-muted">Auto mode</span>
				<div className="flex gap-1 rounded-full bg-control p-0.5">
					{(["copy", "basket"] as const).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setMode(m)}
							className={cn(
								"h-6 rounded-full px-2.5 transition-colors",
								mode === m ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
							)}
						>
							{m === "copy" ? "Copy a trader" : "Basket"}
						</button>
					))}
				</div>
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
					<ol className="grid grid-cols-4 gap-1">
						{STEPS.map((s, i) => (
							<li key={s}>
								<button
									type="button"
									disabled={i > step}
									onClick={() => setStep(i)}
									className="flex w-full flex-col gap-1.5 text-left disabled:cursor-default"
								>
									<span className={cn("h-1 rounded-full", i <= step ? "bg-fg" : "bg-control")} />
									<span className={cn("text-2xs", i === step ? "text-fg" : "text-fg-muted")}>
										{i + 1}. {s}
									</span>
								</button>
							</li>
						))}
					</ol>

					<div key={step} className="flex min-h-[300px] animate-[ct4-in_200ms_ease-out] flex-col gap-3">
						<style>{"@keyframes ct4-in{from{opacity:0;transform:scale(.97)}}"}</style>
						{step === 0 && (
							<>
								<span className="text-sm font-medium">Which coin do you want to trade?</span>
								<div className="grid grid-cols-2 gap-2">
									{COINS.map((c) => (
										<button
											key={c}
											type="button"
											onClick={() => {
												setCoin(c);
												setPicked(null);
												setStep(1);
											}}
											className={cn(
												"flex items-center gap-2.5 rounded-8 px-3 py-2.5 text-left transition-colors",
												coin === c ? "bg-control-hover" : "bg-control hover:bg-control-hover",
											)}
										>
											<AssetDisplay coin={c} hideName iconClassName="size-6" />
											<span className="flex flex-col">
												<span className="text-xs font-medium">{c}</span>
												<span className="text-2xs text-fg-muted">{topTraders(c).length} top traders</span>
											</span>
										</button>
									))}
								</div>
							</>
						)}

						{step === 1 && (
							<>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Pick a {coin} trader</span>
									<div className="flex gap-1">
										{(["all", "bull", "bear"] as const).map((l) => (
											<button
												key={l}
												type="button"
												onClick={() => setLean(l)}
												className={cn(
													"h-6 rounded-full px-2 text-xs transition-colors",
													lean === l
														? "bg-fill text-fg-inverse"
														: "bg-control text-fg-secondary hover:bg-control-hover",
												)}
											>
												{l === "all" ? "All" : LEAN_LABEL[l]}
											</button>
										))}
									</div>
								</div>
								<div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto">
									{topTraders(coin, lean, "score", 12).map((t) => (
										<PickRow
											key={t.address}
											t={t}
											on={picked?.address === t.address}
											onPick={() => {
												setPicked(t);
												setStep(2);
											}}
										/>
									))}
								</div>
								<div className="flex h-9 items-center gap-2 rounded-8 bg-control pr-1 pl-3">
									<input
										value={address}
										onChange={(e) => setAddress(e.target.value)}
										placeholder="Or paste an address"
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
							</>
						)}

						{step === 2 && picked && (
							<>
								<span className="text-sm font-medium">Set your max leverage</span>
								<div className="flex flex-col items-center gap-1 rounded-12 bg-control py-6">
									<span className="text-2xl font-semibold tabular-nums">{leverage}x</span>
									<span className="text-xs text-fg-muted">
										The bot never goes above this, even if {picked.name} does.
									</span>
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
							</>
						)}

						{step === 3 && picked && (
							<>
								<span className="text-sm font-medium">Review</span>
								<div className="flex flex-col gap-2 rounded-12 bg-control p-4 text-xs">
									<Line label="Coin" value={coin} />
									<Line label="Trader" value={picked.name} />
									<Line
										label="Score"
										value={picked.grade === "Unrated" ? "Not on the leaderboard" : `${picked.score}, ${picked.grade}`}
									/>
									<Line label="Lean" value={picked.grade === "Unrated" ? "Unknown" : LEAN_LABEL[leanOf(picked.lean)]} />
									<Line label="Max leverage" value={`${leverage}x`} />
								</div>
								<p className="text-xs text-fg-muted">
									The bot follows the trader&apos;s winning trends with fewer trades. Trading can lose money.
								</p>
							</>
						)}
					</div>

					<div className="grid grid-cols-2 gap-2">
						<Button
							variant="secondary"
							intent="neutral"
							size="md"
							disabled={step === 0}
							onClick={() => setStep((s) => s - 1)}
						>
							Back
						</Button>
						{step < 3 ? (
							<Button
								variant="filled"
								intent="neutral"
								size="md"
								disabled={!canNext}
								onClick={() => setStep((s) => s + 1)}
							>
								Next
							</Button>
						) : (
							<Button
								variant="filled"
								intent="brand"
								size="md"
								onClick={() => {
									if (!picked) return;
									setRunning(picked);
									toast.success(`Copying ${picked.name}. Max leverage ${leverage}x.`);
								}}
							>
								Start bot
							</Button>
						)}
					</div>
				</>
			)}
		</div>
	);
}

function PickRow({ t, on, onPick }: { t: Trader; on: boolean; onPick: () => void }) {
	const side = leanOf(t.lean);
	return (
		<button
			type="button"
			onClick={onPick}
			className={cn(
				"flex items-center gap-3 rounded-8 px-3 py-2 text-left transition-colors",
				on ? "bg-control-hover" : "bg-control hover:bg-control-hover",
			)}
		>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-xs font-medium">{t.name}</span>
				<span className="flex gap-2 text-2xs text-fg-muted tabular-nums">
					<span>
						Score {t.score} {t.grade.toLowerCase()}
					</span>
					<span className={cn(side === "bull" && "text-market-up", side === "bear" && "text-market-down")}>
						{LEAN_LABEL[side]}
					</span>
					<span className="inline-flex items-center gap-0.5">
						<UsersIcon className="size-3" />
						{count(t.followers)}
					</span>
				</span>
			</span>
			<span className={cn("text-xs tabular-nums", t.month.pnl >= 0 ? "text-market-up" : "text-market-down")}>
				{usd(t.month.pnl, true)}
			</span>
			{on && <CheckIcon weight="bold" className="size-3.5" />}
		</button>
	);
}

function Line({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-fg-muted">{label}</span>
			<span className="truncate">{value}</span>
		</div>
	);
}

function Tile({ label, value, sub, up }: { label: string; value: string; sub: string; up?: boolean }) {
	return (
		<div className="flex flex-col gap-0.5 rounded-8 bg-control px-3 py-2.5">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn("text-sm font-medium tabular-nums", up && "text-market-up")}>{value}</span>
			<span className="text-2xs text-fg-muted tabular-nums">{sub}</span>
		</div>
	);
}
