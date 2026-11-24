import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@hypeterminal/ui";
import { ArrowRightIcon, CaretDownIcon, CaretUpIcon, CheckIcon, CopyIcon, XIcon } from "@phosphor-icons/react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePortfolio } from "@/hooks/use-portfolio";
import { cn } from "@/lib/cn";
import { RANGES, type RangeId, SERIES, type SeriesId, seriesFor, type TabId } from "@/lib/portfolio/model";
import { enter, TextToggle } from "../portfolio/controls";
import { CountUp } from "../portfolio/count-up";
import { MobileTabRows } from "../portfolio/mobile-tab-rows";
import { StatRow, stats } from "../portfolio/portfolio-board";
import { PortfolioChart } from "../portfolio/portfolio-chart";
import { findTrader, move, pct, pnlClass, prizeFor, signedUsd, traderName, usd, usdCompact } from "./data";
import { Identicon, RankMove } from "./parts";

const STAT_LABELS = ["Win rate", "Max drawdown", "Leverage", "Direction bias", "Long / short", "Unrealized PNL"];
const ACTIVITY: { id: TabId; label: string }[] = [
	{ id: "positions", label: "Positions" },
	{ id: "history", label: "Trades" },
	{ id: "orders", label: "Orders" },
];

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const long = (a: string) => `${a.slice(0, 10)}…${a.slice(-8)}`;
const SERIES_SHORT = SERIES.map((s) => ({ id: s.id, label: s.id === "value" ? "Value" : s.label }));

/** Opens on /tournament?trader=0x… so the drawer is linkable and Back closes it. */
export function TraderDrawer() {
	const { trader } = useSearch({ from: "/tournament" });
	const navigate = useNavigate({ from: "/tournament" });
	const isMobile = useIsMobile();
	const [shown, setShown] = useState(trader);
	if (trader && trader !== shown) setShown(trader);

	function close() {
		navigate({ search: {}, replace: true, resetScroll: false });
	}

	return (
		<Drawer side={isMobile ? "bottom" : "right"} open={!!trader} onOpenChange={(o) => !o && close()}>
			<DrawerContent
				className={cn(
					"overflow-hidden",
					isMobile ? "h-[86dvh]" : "inset-y-2 right-2 w-[460px] max-w-[calc(100vw-16px)] rounded-16",
				)}
			>
				{isMobile && <span className="mx-auto mt-2 h-1 w-9 flex-none rounded-full bg-control-hover" />}
				{shown && <Body address={shown as `0x${string}`} />}
			</DrawerContent>
		</Drawer>
	);
}

function Body({ address }: { address: `0x${string}` }) {
	const found = findTrader(address);
	const { data } = usePortfolio(address);
	const [series, setSeries] = useState<SeriesId>("pnl");
	const [range, setRange] = useState<RangeId>("week");
	const [tab, setTab] = useState<TabId>("positions");
	const list = stats(data, range).filter((s) => STAT_LABELS.includes(s.label));
	const counts = (id: TabId) => (data.loading[id] || data.failed[id] ? "" : ` ${data.rows[id].length}`);

	return (
		<>
			<Header address={address} />
			<div key={address} className={cn("flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3", enter)}>
				{found ? <RoundCard {...found} /> : <NotRanked />}

				<section className="flex flex-col rounded-12 bg-surface p-4">
					<div className="flex items-center justify-between">
						<TextToggle items={SERIES_SHORT} value={series} onChange={setSeries} />
						<TextToggle items={RANGES} value={range} onChange={setRange} />
					</div>
					<div className="mt-4">
						<PortfolioChart
							points={seriesFor(data.history, series, range)}
							series={series}
							range={range}
							height={148}
							loading={data.loading.chart}
						/>
					</div>
				</section>

				<section className="flex flex-col rounded-12 bg-surface py-1">
					{list.map((s) => (
						<StatRow key={s.label} stat={s} />
					))}
				</section>

				<section className="flex flex-col rounded-12 bg-surface">
					<div className="flex h-11 items-center px-4">
						<TextToggle
							items={ACTIVITY.map((a) => ({ id: a.id, label: `${a.label}${counts(a.id)}` }))}
							value={tab}
							onChange={setTab}
						/>
					</div>
					<MobileTabRows tab={tab} rows={data.rows} loading={data.loading[tab]} failed={data.failed[tab]} />
				</section>
			</div>
			<div className="flex-none px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<Link
					to="/tournament/$address"
					params={{ address }}
					className="flex h-11 w-full items-center justify-center gap-1.5 rounded-8 bg-control text-sm font-medium transition-colors hover:bg-control-hover"
				>
					Full profile
					<ArrowRightIcon className="size-3.5" />
				</Link>
			</div>
		</>
	);
}

function Header({ address }: { address: `0x${string}` }) {
	const found = findTrader(address);
	const navigate = useNavigate({ from: "/tournament" });
	const [copied, setCopied] = useState(false);
	const list = found?.tier.traders;
	const prev = found && found.index > 0 ? list?.[found.index - 1] : undefined;
	const next = found && found.index >= 0 ? list?.[found.index + 1] : undefined;

	useEffect(() => {
		if (!copied) return;
		const t = setTimeout(() => setCopied(false), 1500);
		return () => clearTimeout(t);
	}, [copied]);

	function go(to?: { address: string }) {
		if (to) navigate({ search: { trader: to.address }, replace: true, resetScroll: false });
	}

	function copy() {
		navigator.clipboard.writeText(address).then(() => setCopied(true));
	}

	return (
		<div className="flex flex-none items-center gap-3 py-4 pr-3 pl-4">
			<Identicon id={address} className="size-10 rounded-full" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<DrawerTitle className="truncate text-base font-semibold">
					{found ? traderName(found.trader) : short(address)}
				</DrawerTitle>
				<button
					type="button"
					onClick={copy}
					className="inline-flex w-fit items-center gap-1.5 text-xs text-fg-muted tabular-nums transition-colors hover:text-fg"
				>
					{long(address)}
					{copied ? <CheckIcon className="size-3 text-fg" /> : <CopyIcon className="size-3" />}
				</button>
			</div>
			{found && (
				<div className="flex items-center">
					<IconButton label="Previous trader" disabled={!prev} onClick={() => go(prev)}>
						<CaretUpIcon className="size-4" />
					</IconButton>
					<IconButton label="Next trader" disabled={!next} onClick={() => go(next)}>
						<CaretDownIcon className="size-4" />
					</IconButton>
				</div>
			)}
			<DrawerClose
				aria-label="Close"
				className="grid size-8 place-items-center rounded-8 text-fg-muted transition-colors hover:bg-control hover:text-fg"
			>
				<XIcon className="size-4" />
			</DrawerClose>
		</div>
	);
}

interface IconButtonProps {
	label: string;
	disabled: boolean;
	onClick: () => void;
	children: ReactNode;
}

function IconButton({ label, disabled, onClick, children }: IconButtonProps) {
	return (
		<button
			type="button"
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
			className="grid size-8 place-items-center rounded-8 text-fg-muted transition-colors hover:bg-control hover:text-fg disabled:pointer-events-none disabled:opacity-40"
		>
			{children}
		</button>
	);
}

type Found = NonNullable<ReturnType<typeof findTrader>>;

function RoundCard({ trader: r, tier }: Found) {
	const prize = prizeFor(tier, r.rank);
	return (
		<section className="flex flex-col gap-5 rounded-12 bg-surface p-4">
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-1.5">
					<span className="text-xs text-fg-muted">Round PNL</span>
					<CountUp
						value={r.pnl}
						format={(n) => signedUsd(n)}
						className={cn("text-2xl leading-none font-semibold tracking-tight tabular-nums", pnlClass(r.pnl))}
					/>
				</div>
				<div className="flex flex-col items-end gap-1.5">
					<span className="text-xs text-fg-muted">{tier.label}</span>
					<span className="flex items-baseline gap-2 text-2xl leading-none font-semibold tracking-tight tabular-nums">
						<RankMove value={move(r)} className="text-xs font-normal tracking-normal" />
						<span>
							<span className="text-fg-muted">#</span>
							{r.rank}
						</span>
					</span>
				</div>
			</div>
			<dl className="grid grid-cols-3 gap-3 text-xs tabular-nums">
				<Cell label="ROI" value={pct(r.roi)} />
				<Cell label="24h PNL" value={signedUsd(r.dayPnl, true)} tone={pnlClass(r.dayPnl)} />
				<Cell label="Round volume" value={usdCompact(r.vlm)} />
			</dl>
			{prize > 0 && (
				<div className="flex h-9 items-center justify-between rounded-8 bg-control px-3 text-xs tabular-nums">
					<span className="text-fg-muted">Prize if the round ended now</span>
					<span className="font-medium">{usd(prize)}</span>
				</div>
			)}
		</section>
	);
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-fg-muted">{label}</dt>
			<dd className={cn("text-sm font-medium", tone)}>{value}</dd>
		</div>
	);
}

function NotRanked() {
	return (
		<section className="rounded-12 bg-surface p-4 text-xs text-fg-muted">
			This trader is not in the round standings.
		</section>
	);
}
