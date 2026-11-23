import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle, Slider } from "@hypeterminal/ui";
import { CaretRightIcon, CirclesThreeIcon, MagnifyingGlassIcon, UserFocusIcon } from "@phosphor-icons/react";
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
	SORT_LABEL,
	type Sort,
	shortAddr,
	type Trader,
	topTraders,
	traderFromAddress,
	unlistedTrader,
	usd,
	type VariantProps,
} from "./data";

type Mode = "copy" | "basket";

export default function V2({ initial }: VariantProps) {
	const [mode, setMode] = useState<Mode>("copy");
	const [coin, setCoin] = useState<string>("BTC");
	const [picked, setPicked] = useState<Trader>(() => topTraders("BTC")[0]);
	const [open, setOpen] = useState(false);
	const [leverage, setLeverage] = useState(10);
	const [running, setRunning] = useState(initial === "running");

	if (running)
		return (
			<div className="flex animate-[ct2-in_200ms_ease-out] flex-col gap-4 px-3 pt-4 pb-4">
				<style>{"@keyframes ct2-in{from{opacity:0;transform:scale(.97)}}"}</style>
				<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
					<div className="flex items-center justify-between gap-3">
						<span className="flex min-w-0 flex-col">
							<span className="text-2xs tracking-micro text-fg-muted uppercase">Copying</span>
							<span className="truncate text-sm font-medium">{picked.name}</span>
						</span>
						<span className="flex items-center gap-1.5 rounded-full bg-control-hover px-2.5 py-1 text-xs text-market-up">
							<span className="size-1.5 rounded-full bg-market-up" />
							Live
						</span>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<Stat label="Your PNL" value={usd(echo.botPnl, true)} tone="up" />
						<Stat label="Their PNL" value={usd(echo.whalePnl, true)} tone="up" />
					</div>
					<div className="flex flex-col gap-3">
						<Bars label="Trades" you={echo.botTrades} them={echo.whaleTrades} fmt={(n) => count(n)} />
						<Bars label="Fees a day" you={echo.botFeesDay} them={echo.whaleFeesDay} fmt={(n) => usd(n)} />
						<Bars label="Turnover a day" you={echo.botTurnoverDay} them={echo.whaleTurnoverDay} fmt={(n) => `${n}%`} />
					</div>
					<p className="text-2xs text-fg-muted">
						Per $100K over {echo.days} days. Max leverage {leverage}x.
					</p>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Button
						variant="secondary"
						intent="neutral"
						size="sm"
						onClick={() => toast.success("Copy trading paused. Positions stay open.")}
					>
						Pause
					</Button>
					<Button
						variant="secondary"
						intent="neutral"
						size="sm"
						onClick={() => {
							setRunning(false);
							toast.success("Stopped copying.");
						}}
					>
						Change trader
					</Button>
				</div>
			</div>
		);

	return (
		<div className="flex flex-col gap-4 px-3 pt-4 pb-4">
			<div className="flex flex-col gap-1">
				<ModeRow
					on={mode === "copy"}
					icon={<UserFocusIcon className="size-4" />}
					title="Copy a trader"
					body="Follow one Hyperliquid trader with low churn."
					onClick={() => setMode("copy")}
				/>
				<ModeRow
					on={mode === "basket"}
					icon={<CirclesThreeIcon className="size-4" />}
					title="Basket"
					body="Follow the mood ring of 37 traders."
					onClick={() => setMode("basket")}
				/>
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
					<div className="flex flex-col gap-2">
						<span className="text-xs text-fg-muted">Trader</span>
						<button
							type="button"
							onClick={() => setOpen(true)}
							className="flex items-center gap-3 rounded-8 bg-control px-3 py-2.5 text-left transition-colors hover:bg-control-hover"
						>
							<ScoreBadge score={picked.score} />
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate text-xs font-medium">{picked.name}</span>
								<span className="text-2xs text-fg-muted">
									{picked.grade}, {LEAN_LABEL[leanOf(picked.lean)].toLowerCase()}, {count(picked.followers)} followers
								</span>
							</span>
							<span className="text-xs text-fg-secondary">Change</span>
							<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
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

					<Button
						variant="filled"
						intent="brand"
						size="md"
						onClick={() => {
							setRunning(true);
							toast.success(`Copying ${picked.name}. Max leverage ${leverage}x.`);
						}}
					>
						Start copy trading
					</Button>
				</>
			)}

			<Directory
				open={open}
				coin={coin}
				onCoin={setCoin}
				pickedAddress={picked.address}
				onClose={() => setOpen(false)}
				onPick={(t) => {
					setPicked(t);
					setOpen(false);
				}}
			/>
		</div>
	);
}

interface DirectoryProps {
	open: boolean;
	coin: string;
	onCoin: (c: string) => void;
	pickedAddress: string;
	onClose: () => void;
	onPick: (t: Trader) => void;
}

function Directory({ open, coin, onCoin, pickedAddress, onClose, onPick }: DirectoryProps) {
	const [lean, setLean] = useState<Lean>("all");
	const [sort, setSort] = useState<Sort>("score");
	const [query, setQuery] = useState("");
	const q = query.trim().toLowerCase();
	const pasted = isAddress(q);
	const rows = topTraders(coin, lean, sort).filter((t) => !q || pasted || t.name.toLowerCase().includes(q));
	const match = pasted ? traderFromAddress(q) : null;

	return (
		<Modal open={open} onOpenChange={(next) => !next && onClose()}>
			<ModalPopup size="lg" className="max-w-[640px]">
				<ModalHeader>
					<ModalTitle>Trader directory</ModalTitle>
				</ModalHeader>
				<ModalContent className="flex flex-col gap-3">
					<div className="flex h-9 items-center gap-2 rounded-8 bg-control px-3">
						<MagnifyingGlassIcon className="size-4 text-fg-muted" />
						<input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search a name or paste an address"
							className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
						/>
					</div>
					<div className="flex flex-wrap items-center gap-1">
						{COINS.map((c) => (
							<Chip key={c} on={coin === c} onClick={() => onCoin(c)}>
								<AssetDisplay coin={c} hideName iconClassName="size-3.5" />
								{c}
							</Chip>
						))}
					</div>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex gap-1">
							{(["all", "bull", "bear"] as const).map((l) => (
								<Chip key={l} on={lean === l} onClick={() => setLean(l)}>
									{l === "all" ? "Any lean" : LEAN_LABEL[l]}
								</Chip>
							))}
						</div>
						<div className="flex items-center gap-1 text-xs">
							<span className="text-fg-muted">Sort</span>
							{(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
								<Chip key={s} on={sort === s} onClick={() => setSort(s)}>
									{SORT_LABEL[s]}
								</Chip>
							))}
						</div>
					</div>

					{pasted ? (
						<div className="flex items-center gap-3 rounded-8 bg-control p-3 text-xs">
							<span className="flex-1">
								{match
									? `${match.name} is on the leaderboard with score ${match.score}.`
									: `${shortAddr(q)} is not on the leaderboard snapshot. The bot can still copy it.`}
							</span>
							<Button
								variant="filled"
								intent="neutral"
								size="xs"
								onClick={() => {
									const t = match ?? unlistedTrader(q);
									onPick(t);
									toast.success(`Selected ${t.name}.`);
								}}
							>
								Select
							</Button>
						</div>
					) : (
						<div className="flex max-h-[420px] flex-col overflow-y-auto">
							<div className="grid grid-cols-[20px_1fr_88px_72px_56px_72px] gap-3 px-2 pb-2 text-2xs text-fg-muted">
								<span>#</span>
								<span>Trader</span>
								<span>Score</span>
								<span>Lean</span>
								<span className="text-right">Followers</span>
								<span className="text-right">30d PNL</span>
							</div>
							{rows.map((t, i) => (
								<button
									key={t.address}
									type="button"
									onClick={() => onPick(t)}
									className={cn(
										"grid grid-cols-[20px_1fr_88px_72px_56px_72px] items-center gap-3 rounded-8 px-2 py-2 text-left text-xs tabular-nums transition-colors",
										t.address === pickedAddress ? "bg-control-hover" : "hover:bg-control",
									)}
								>
									<span className="text-fg-muted">{i + 1}</span>
									<span className="flex min-w-0 flex-col">
										<span className="truncate font-medium">{t.name}</span>
										<span className="text-2xs text-fg-muted">
											{usd(t.allTime.pnl, true)} all time, {usd(t.accountValue)} equity
										</span>
									</span>
									<span className="flex flex-col gap-1">
										<span className="flex items-baseline gap-1">
											<span className="font-medium">{t.score}</span>
											<span className="truncate text-2xs text-fg-muted">{t.grade}</span>
										</span>
										<span className="h-1 overflow-hidden rounded-full bg-control">
											<span className="block h-full rounded-full bg-fg-secondary" style={{ width: `${t.score}%` }} />
										</span>
									</span>
									<LeanMeter lean={t.lean} />
									<span className="text-right text-fg-secondary">{count(t.followers)}</span>
									<span className={cn("text-right", t.month.pnl >= 0 ? "text-market-up" : "text-market-down")}>
										{usd(t.month.pnl, true)}
									</span>
								</button>
							))}
							{rows.length === 0 && <p className="py-8 text-center text-xs text-fg-muted">No traders match.</p>}
						</div>
					)}
					<p className="text-2xs text-fg-muted">
						Score 0 to 100: track record before the last 30 days (50), week, month and all-time PNL in profit (30),
						all-time ROI (20).
					</p>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}

function ModeRow({
	on,
	icon,
	title,
	body,
	onClick,
}: {
	on: boolean;
	icon: React.ReactNode;
	title: string;
	body: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-3 rounded-8 px-3 py-2.5 text-left transition-colors",
				on ? "bg-control-hover" : "bg-control hover:bg-control-hover",
			)}
		>
			<span className={cn("grid size-8 place-items-center rounded-full bg-surface", on ? "text-fg" : "text-fg-muted")}>
				{icon}
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className={cn("text-xs font-medium", !on && "text-fg-secondary")}>{title}</span>
				<span className="text-2xs text-fg-muted">{body}</span>
			</span>
			<span className={cn("grid size-4 place-items-center rounded-full", on ? "bg-fill" : "bg-surface")}>
				{on && <span className="size-1.5 rounded-full bg-background" />}
			</span>
		</button>
	);
}

function ScoreBadge({ score }: { score: number }) {
	return (
		<span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold tabular-nums">
			{score}
		</span>
	);
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs transition-colors",
				on ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary hover:bg-control-hover",
			)}
		>
			{children}
		</button>
	);
}

function LeanMeter({ lean }: { lean: number }) {
	const side = leanOf(lean);
	return (
		<span className="flex flex-col gap-1">
			<span
				className={cn(
					"text-2xs",
					side === "bull" && "text-market-up",
					side === "bear" && "text-market-down",
					side === "flat" && "text-fg-muted",
				)}
			>
				{LEAN_LABEL[side]}
			</span>
			<span className="relative h-1 rounded-full bg-control">
				<span className="absolute top-0 left-1/2 h-full w-px bg-fg-muted" />
				<span
					className={cn("absolute top-0 h-full rounded-full", lean >= 0 ? "bg-market-up" : "bg-market-down")}
					style={lean >= 0 ? { left: "50%", width: `${lean / 2}%` } : { right: "50%", width: `${-lean / 2}%` }}
				/>
			</span>
		</span>
	);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
	return (
		<span className="flex flex-col gap-0.5 rounded-8 bg-control-hover px-3 py-2">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span
				className={cn(
					"text-sm font-medium tabular-nums",
					tone === "up" && "text-market-up",
					tone === "down" && "text-market-down",
				)}
			>
				{value}
			</span>
		</span>
	);
}

function Bars({ label, you, them, fmt }: { label: string; you: number; them: number; fmt: (n: number) => string }) {
	const max = Math.max(you, them);
	return (
		<div className="flex flex-col gap-1 text-xs">
			<span className="text-fg-muted">{label}</span>
			<div className="grid grid-cols-[40px_1fr_56px] items-center gap-2 tabular-nums">
				<span className="text-2xs text-fg-muted">You</span>
				<span className="h-1.5 rounded-full bg-control-hover">
					<span className="block h-full rounded-full bg-fg" style={{ width: `${(you / max) * 100}%` }} />
				</span>
				<span className="text-right">{fmt(you)}</span>
				<span className="text-2xs text-fg-muted">Them</span>
				<span className="h-1.5 rounded-full bg-control-hover">
					<span className="block h-full rounded-full bg-fg-muted" style={{ width: `${(them / max) * 100}%` }} />
				</span>
				<span className="text-right text-fg-secondary">
					{them === echo.whaleTrades ? "~" : ""}
					{fmt(them)}
				</span>
			</div>
		</div>
	);
}
