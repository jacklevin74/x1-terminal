import { Button, Dropdown } from "@hypeterminal/ui";
import {
	ArrowCounterClockwiseIcon,
	ArrowLeftIcon,
	CaretDownIcon,
	CaretRightIcon,
	CaretUpIcon,
	CheckIcon,
	MagnifyingGlassIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { type ComponentType, createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { scoreOf } from "../copy-trader/data";
import {
	basketMood,
	byId,
	count,
	type DegenParts,
	type DirTrader,
	degenLabel,
	hypeSide,
	isAddress,
	leaderboard,
	MOOD_MARKET,
	memberNote,
	moodLabel,
	pastedTrader,
	pnlTone,
	type Query,
	queryDirectory,
	SORT_KEYS,
	SORT_LABEL,
	type SortKey,
	sortValue,
	tradesText,
	usd,
	WINDOW_LABEL,
	type Window,
} from "../copy-trader-2/data";
import { Identicon } from "../copy-trader-2/identicon";
import {
	type BasketEditorProps,
	type DirectoryProps,
	defaultMembers,
	isDefault,
	type Member,
	MoodBar,
	onIds,
	Surface,
	SurfaceTitle,
} from "../copy-trader-2/panel";
import probe from "./months-probe.json";

export type ConsistencyBlock = ComponentType<{ t: DirTrader }>;

export const StartContext = createContext<{ detail: boolean }>({ detail: false });

const WINDOWS: Window[] = ["d7", "d30", "all"];

export interface Period {
	label: string;
	pnl: number;
}

const probeMonths = (probe as { traders: Record<string, { m: string; y: number; pnl: number }[]> }).traders;

export interface MonthRow {
	m: string;
	y: number;
	pnl: number;
}

/** All saved months for a trader (probe first, then Jack's 4), oldest first. */
export function monthsOf(t: DirTrader): MonthRow[] | null {
	const long = probeMonths[t.id];
	if (long) return long;
	if (t.months?.length) return t.months.map((m) => ({ ...m, y: 2026 }));
	return null;
}

const probeSeries = (probe as unknown as { series?: Record<string, [number, number][]> }).series ?? {};

/** Cumulative PNL points [timestamp, pnl] over the last 12 months, rebased to 0. Weekly for the probe, month ends otherwise. */
export function seriesOf(t: DirTrader): [number, number][] | null {
	const long = probeSeries[t.id];
	if (long) return long;
	const months = monthsOf(t);
	if (!months) return null;
	const MONTH_INDEX: Record<string, number> = {
		Jan: 0,
		Feb: 1,
		Mar: 2,
		Apr: 3,
		May: 4,
		Jun: 5,
		Jul: 6,
		Aug: 7,
		Sep: 8,
		Oct: 9,
		Nov: 10,
		Dec: 11,
	};
	const first = months[0];
	const start = Date.UTC(first.y, MONTH_INDEX[first.m] ?? 0, 1);
	let sum = 0;
	const out: [number, number][] = [[start, 0]];
	for (const m of months) {
		sum += m.pnl;
		out.push([Date.UTC(m.y, (MONTH_INDEX[m.m] ?? 0) + 1, 1), sum]);
	}
	return out;
}

export function cumulative(months: MonthRow[]) {
	const out: number[] = [];
	let sum = 0;
	for (const m of months) {
		sum += m.pnl;
		out.push(sum);
	}
	return out;
}

export function maxDrawdown(months: MonthRow[]) {
	let peak = 0;
	let sum = 0;
	let worst = 0;
	let from = 0;
	let to = 0;
	let peakAt = 0;
	months.forEach((m, i) => {
		sum += m.pnl;
		if (sum > peak) {
			peak = sum;
			peakAt = i;
		}
		if (peak - sum > worst) {
			worst = peak - sum;
			from = peakAt;
			to = i;
		}
	});
	return { amount: worst, from: months[from], to: months[to] };
}

export function longestRun(months: MonthRow[], green: boolean) {
	let best = 0;
	let cur = 0;
	for (const m of months) {
		cur = (green ? m.pnl > 0 : m.pnl < 0) ? cur + 1 : 0;
		if (cur > best) best = cur;
	}
	return best;
}

export function useWidth() {
	const ref = useRef<HTMLDivElement>(null);
	const [w, setW] = useState(0);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const o = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
		o.observe(el);
		return () => o.disconnect();
	}, []);
	return { ref, w };
}

export function periodsOf(t: DirTrader): { months: boolean; periods: Period[] } {
	const long = probeMonths[t.id];
	if (long) return { months: true, periods: long.slice(-12).map((m) => ({ label: m.m, pnl: m.pnl })) };
	if (t.months?.length) return { months: true, periods: t.months.map((m) => ({ label: m.m, pnl: m.pnl })) };
	const periods: Period[] = [];
	for (const w of WINDOWS) {
		const pnl = t.pnl[w];
		if (pnl !== null) periods.push({ label: WINDOW_LABEL[w], pnl });
	}
	return { months: false, periods };
}

export const greenCount = (periods: Period[]) => periods.filter((p) => p.pnl > 0).length;

export function biggestShare(periods: Period[]) {
	const abs = periods.map((p) => Math.abs(p.pnl));
	const sum = abs.reduce((a, b) => a + b, 0);
	return sum ? Math.max(...abs) / sum : 0;
}

export function bestAndWorst(periods: Period[]) {
	const sorted = [...periods].sort((a, b) => b.pnl - a.pnl);
	return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

export function pctText(n: number) {
	if (n > 0 && n < 0.005) return "under 1%";
	return `${Math.round(n * 100)}%`;
}

export type Grade = "Consistent" | "Mixed" | "One big run" | "Losing";

export function gradeOf(t: DirTrader): Grade {
	if ((t.pnl.all ?? 0) <= 0) return "Losing";
	if (t.consistency >= 70) return "Consistent";
	if (t.consistency >= 40) return "Mixed";
	return "One big run";
}

const lbRows = new Map(leaderboard.rows.map((r) => [r.address.toLowerCase(), r]));

export function windowParts(t: DirTrader) {
	const row = lbRows.get(t.id);
	return row ? scoreOf(row).parts : null;
}

export function tileBg(pnl: number) {
	if (pnl === 0) return "var(--color-control-hover)";
	const tone = pnl > 0 ? "var(--color-market-up)" : "var(--color-market-down)";
	return `color-mix(in oklch, ${tone} 22%, var(--color-control))`;
}

export const WINDOWS_NOTE = "No monthly PNL for this trader. Showing the 7d, 30d and all-time windows.";

export function ConsistencyHead({ t, children }: { t: DirTrader; children?: ReactNode }) {
	return (
		<span className="flex items-baseline justify-between gap-3 text-xs">
			<span className="text-fg-muted">Consistency</span>
			<span className="tabular-nums">
				{t.consistency}
				{children}
			</span>
		</span>
	);
}

export type PresetKey = "pool" | "pnl30" | "pnlAll" | "consistent" | "lowDegen" | "active";

export const PRESETS: { key: PresetKey; label: string; done: string }[] = [
	{ key: "pool", label: "Pool default (37)", done: "Basket set to the 37 pool traders." },
	{ key: "pnl30", label: "Top PNL 30d", done: "Basket set to the 6 traders with the top PNL over 30d." },
	{ key: "pnlAll", label: "Top PNL all time", done: "Basket set to the 6 traders with the top all-time PNL." },
	{ key: "consistent", label: "Most consistent", done: "Basket set to the 6 most consistent traders." },
	{ key: "lowDegen", label: "Lowest degen", done: "Basket set to the 6 traders with the lowest degen score." },
	{ key: "active", label: "Most active", done: "Basket set to the 6 most active traders." },
];

const PRESET_QUERY: Record<Exclude<PresetKey, "pool">, Query> = {
	pnl30: { sort: "pnl", window: "d30" },
	pnlAll: { sort: "pnl", window: "all" },
	consistent: { sort: "consistency", window: "d30" },
	lowDegen: { sort: "degen", window: "d30", dir: "asc" },
	active: { sort: "trades", window: "d30" },
};

export const PRESET_SIZE = 6;

export function presetMembers(key: PresetKey): Member[] {
	if (key === "pool") return defaultMembers();
	return queryDirectory(PRESET_QUERY[key])
		.slice(0, PRESET_SIZE)
		.map((t) => ({ id: t.id, on: true }));
}

function sameMembers(a: Member[], b: Member[]) {
	return a.length === b.length && a.every((m, i) => m.id === b[i].id && m.on === b[i].on);
}

export function activePreset(members: Member[]): PresetKey | "custom" {
	if (isDefault(members)) return "pool";
	return PRESETS.find((p) => p.key !== "pool" && sameMembers(members, presetMembers(p.key)))?.key ?? "custom";
}

export function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"h-7 shrink-0 rounded-full px-2.5 text-xs whitespace-nowrap transition-colors",
				on ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary hover:bg-control-hover",
			)}
		>
			{children}
		</button>
	);
}

interface TwoPaneProps {
	list: ReactNode;
	detail: ReactNode;
	pushed: boolean;
	onBack: () => void;
	listClassName: string;
	detailClassName: string;
}

function TwoPane({ list, detail, pushed, onBack, listClassName, detailClassName }: TwoPaneProps) {
	return (
		<div className="flex min-h-0 flex-1 @max-3xl:flex-col">
			<div
				className={cn(
					"flex min-h-0 flex-col gap-2 pl-4 @max-3xl:w-full @max-3xl:flex-1 @max-3xl:pr-4",
					listClassName,
					pushed && "@max-3xl:hidden",
				)}
			>
				{list}
			</div>
			<div
				className={cn(
					"min-h-0 overflow-y-auto px-4 pb-4 @max-3xl:w-full @max-3xl:flex-1",
					detailClassName,
					!pushed && "@max-3xl:hidden",
				)}
			>
				{pushed && (
					<button
						type="button"
						onClick={onBack}
						className="mb-3 hidden items-center gap-1.5 text-xs text-fg-muted hover:text-fg @max-3xl:flex"
					>
						<ArrowLeftIcon className="size-3.5" />
						All traders
					</button>
				)}
				{detail}
			</div>
		</div>
	);
}

function sortText(t: DirTrader, key: SortKey, window: Window) {
	if (key === "pnl") return usd(t.pnl[window], true);
	if (key === "trades") return tradesText(t);
	const v = sortValue(t, key, window);
	return v === null ? "n/a" : String(v);
}

function SortHeader({ sort, window, onWindow }: { sort: SortKey; window: Window; onWindow: (w: Window) => void }) {
	return (
		<div className="flex h-7 shrink-0 items-center justify-between pr-1 pl-2 text-xs text-fg-muted">
			<span>Trader</span>
			{sort === "pnl" ? (
				<Dropdown
					size="sm"
					align="end"
					triggerVariant="minimal"
					triggerAriaLabel="PNL range"
					trigger={`PNL ${WINDOW_LABEL[window]}`}
					triggerClassName="text-fg-secondary"
					popupClassName="min-w-28"
					items={WINDOWS.map((w) => ({ label: WINDOW_LABEL[w], active: w === window, onSelect: () => onWindow(w) }))}
				/>
			) : (
				<span className="pr-1">{SORT_LABEL[sort]}</span>
			)}
		</div>
	);
}

interface BrowserProps {
	pickedId: string | null;
	onPick: (t: DirTrader) => void;
	Consistency: ConsistencyBlock;
}

function Browser({ pickedId, onPick, Consistency }: BrowserProps) {
	const start = useContext(StartContext);
	const [sort, setSort] = useState<SortKey>("consistency");
	const [window, setWindow] = useState<Window>("d30");
	const [text, setText] = useState("");
	const [focusId, setFocusId] = useState<string | null>(null);
	const [pushed, setPushed] = useState(start.detail);
	const list = isAddress(text) ? [pastedTrader(text)] : queryDirectory({ sort, window, text });
	const focus = list.find((t) => t.id === (focusId ?? pickedId)) ?? list.find((t) => t.inPool) ?? list[0];

	return (
		<TwoPane
			pushed={pushed}
			onBack={() => setPushed(false)}
			listClassName="w-[340px] shrink-0"
			detailClassName="flex-1"
			list={
				<>
					<label className="flex h-9 shrink-0 items-center gap-2 rounded-8 bg-control px-3">
						<MagnifyingGlassIcon className="size-4 text-fg-muted" />
						<input
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Search or paste an address"
							className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
						/>
					</label>
					<div className="flex shrink-0 gap-1 overflow-x-auto">
						{SORT_KEYS.map((k) => (
							<Pill key={k} on={sort === k} onClick={() => setSort(k)}>
								{SORT_LABEL[k]}
							</Pill>
						))}
					</div>
					<SortHeader sort={sort} window={window} onWindow={setWindow} />
					<div className="min-h-0 flex-1 overflow-y-auto pb-4">
						{list.map((t, i) => (
							<button
								key={t.id}
								type="button"
								onClick={() => {
									setFocusId(t.id);
									setPushed(true);
								}}
								className={cn(
									"flex w-full items-center gap-2.5 rounded-8 px-2 py-2 text-left text-xs transition-colors",
									focus?.id === t.id ? "bg-control-hover" : "hover:bg-control",
								)}
							>
								<span className="w-5 text-2xs text-fg-muted tabular-nums">{i + 1}</span>
								<Identicon id={t.id} className="size-7" />
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="truncate font-medium">{t.name}</span>
									<span className="truncate text-2xs text-fg-muted">
										Degen {t.degen}, consistency {t.consistency}
									</span>
								</span>
								<span className={cn("tabular-nums", sort === "pnl" && pnlTone(t.pnl[window]))}>
									{sortText(t, sort, window)}
								</span>
								{pickedId === t.id && <CheckIcon weight="bold" className="size-3.5" />}
								<CaretRightIcon className="hidden size-3 text-fg-muted @max-3xl:block" />
							</button>
						))}
						{!list.length && <p className="py-10 text-center text-xs text-fg-muted">No traders match.</p>}
					</div>
				</>
			}
			detail={
				focus && (
					<Detail
						key={focus.id}
						t={focus}
						Consistency={Consistency}
						actionLabel={pickedId === focus.id ? "Copying this trader" : "Copy this trader"}
						actionDisabled={pickedId === focus.id}
						onAction={() => onPick(focus)}
					/>
				)
			}
		/>
	);
}

const PART_LABEL: Record<keyof DegenParts, string> = {
	size: "Position size",
	leverage: "Leverage",
	swing: "Biggest swing",
	concentration: "PNL in one period",
	fewTrades: "Few trades",
};

export function Meter({ value }: { value: number | null }) {
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

interface DetailProps {
	t: DirTrader;
	actionLabel: string;
	actionDisabled?: boolean;
	onAction: () => void;
	Consistency: ConsistencyBlock;
}

export function Detail({ t, actionLabel, actionDisabled, onAction, Consistency }: DetailProps) {
	return (
		<div className="@container flex animate-[ct3-in_160ms_ease-out] flex-col gap-4 rounded-12 bg-control p-4">
			<style>{"@keyframes ct3-in{from{opacity:0;transform:scale(.97)}}"}</style>
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
			<Consistency t={t} />
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

const WIDTH = "max-w-[960px]";
const EDITOR_WIDTH = "max-w-[1180px]";

export function Directory({
	open,
	onOpenChange,
	pickedId,
	onPick,
	Consistency,
}: DirectoryProps & { Consistency: ConsistencyBlock }) {
	return (
		<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
			<header className="p-4 pr-14">
				<SurfaceTitle>Trader directory</SurfaceTitle>
			</header>
			<Browser
				pickedId={pickedId}
				Consistency={Consistency}
				onPick={(t) => {
					onPick(t);
					toast.success(`Selected ${t.name}.`);
				}}
			/>
		</Surface>
	);
}

const COLS =
	"grid grid-cols-[32px_20px_minmax(0,1fr)_72px_64px_72px_44px_56px] @max-3xl:grid-cols-[32px_minmax(0,1fr)_64px_44px] items-center gap-x-3";

interface Row {
	t: DirTrader;
	on: boolean;
	locked: boolean;
	note: string;
}

interface TableSort {
	key: SortKey;
	dir: "desc" | "asc";
}

interface TraderTableProps {
	rows: Row[];
	focusId: string | undefined;
	dimOff: boolean;
	onToggle: (id: string) => void;
	onOpen: (id: string) => void;
	sort?: TableSort;
	onSort?: (key: SortKey) => void;
	footer?: ReactNode;
}

function TraderTable({ rows, focusId, dimOff, onToggle, onOpen, sort, onSort, footer }: TraderTableProps) {
	function head(key: SortKey, label: string, className?: string) {
		if (!onSort || !sort) return <span className={cn("text-right", className)}>{label}</span>;
		const on = sort.key === key;
		return (
			<button
				type="button"
				onClick={() => onSort(key)}
				className={cn(
					"inline-flex items-center justify-end gap-1 text-right transition-colors hover:text-fg",
					on && "text-fg",
					className,
				)}
			>
				{label}
				{on && sort.dir === "desc" && <CaretDownIcon weight="bold" className="size-3" />}
				{on && sort.dir === "asc" && <CaretUpIcon weight="bold" className="size-3" />}
			</button>
		);
	}

	return (
		<div className="min-h-0 flex-1 overflow-y-auto pr-0 pb-4">
			<div className={cn(COLS, "sticky top-0 z-10 bg-overlay pr-2 pb-2 text-2xs text-fg-muted")}>
				<span />
				<span className="@max-3xl:hidden">#</span>
				<span>Trader</span>
				{head("pnl", "PNL 30d")}
				{head("trades", "Trades/day", "@max-3xl:hidden")}
				{head("consistency", "Consistency", "@max-3xl:hidden")}
				{head("degen", "Degen")}
				<span className="text-right @max-3xl:hidden">Side {MOOD_MARKET}</span>
			</div>
			{rows.map(({ t, on, locked, note }, i) => {
				const side = hypeSide(t.id);
				const off = dimOff && !on;
				return (
					<div
						key={t.id}
						className={cn(
							COLS,
							"rounded-8 text-xs tabular-nums transition-colors",
							focusId === t.id ? "bg-control-hover" : "hover:bg-control",
							off && "text-fg-disabled",
						)}
					>
						<button
							type="button"
							aria-label={on ? `Uncheck ${t.name}` : `Check ${t.name}`}
							disabled={locked}
							onClick={() => onToggle(t.id)}
							className="flex h-full items-center justify-center disabled:cursor-default"
						>
							<Check on={on} muted={locked} focused={focusId === t.id} />
						</button>
						<button
							type="button"
							onClick={() => onOpen(t.id)}
							className="col-[2/-1] grid grid-cols-subgrid items-center py-2 pr-2 text-left"
						>
							<span className="text-fg-muted @max-3xl:hidden">{i + 1}</span>
							<span className="flex min-w-0 items-center gap-2.5">
								<Identicon id={t.id} className={cn("size-7 shrink-0", off && "opacity-40")} />
								<span className="flex min-w-0 flex-col">
									<span className="truncate font-medium">{t.name}</span>
									<span className="truncate text-2xs text-fg-muted">{note}</span>
								</span>
							</span>
							<span className={cn("text-right", !off && pnlTone(t.pnl.d30))}>{usd(t.pnl.d30, true)}</span>
							<span className="text-right @max-3xl:hidden">{tradesText(t)}</span>
							<span className="text-right @max-3xl:hidden">{t.consistency}</span>
							<span className="text-right">{t.degen}</span>
							<span
								className={cn(
									"text-right @max-3xl:hidden",
									!off && side === "Long" && "text-market-up",
									!off && side === "Short" && "text-market-down",
									!side && "text-fg-muted",
								)}
							>
								{side ?? "None"}
							</span>
						</button>
					</div>
				);
			})}
			{footer}
		</div>
	);
}

function Check({ on, muted, focused }: { on: boolean; muted?: boolean; focused: boolean }) {
	return (
		<span
			className={cn(
				"grid size-4 place-items-center rounded-4",
				on && !muted && "bg-brand text-fg-inverse",
				on && muted && (focused ? "bg-overlay text-fg-muted" : "bg-control-hover text-fg-muted"),
				!on && (focused ? "bg-overlay" : "bg-control-hover"),
			)}
		>
			{on && <CheckIcon weight="bold" className="size-3" />}
		</span>
	);
}

export function BasketEditor({
	open,
	onOpenChange,
	members,
	onChange,
	startInAdd,
	Consistency,
}: BasketEditorProps & { Consistency: ConsistencyBlock }) {
	const start = useContext(StartContext);
	const [view, setView] = useState<"list" | "add">(startInAdd ? "add" : "list");
	const [focusId, setFocusId] = useState<string | null>(null);
	const [pushed, setPushed] = useState(start.detail);

	function show(next: "list" | "add") {
		setView(next);
		setFocusId(null);
		setPushed(false);
	}

	function openRow(id: string) {
		setFocusId(id);
		setPushed(true);
	}

	function toggle(id: string) {
		onChange(members.map((m) => (m.id === id ? { ...m, on: !m.on } : m)));
	}

	if (view === "add")
		return (
			<Surface open={open} onOpenChange={onOpenChange} width={EDITOR_WIDTH}>
				<AddTraders
					members={members}
					onChange={onChange}
					onBack={() => show("list")}
					focusId={focusId}
					pushed={pushed}
					onOpen={openRow}
					onBackFromDetail={() => setPushed(false)}
					Consistency={Consistency}
				/>
			</Surface>
		);

	const ids = onIds(members);
	const mood = basketMood(ids);
	const preset = activePreset(members);
	const rows = members.map((m) => {
		const t = byId.get(m.id) ?? pastedTrader(m.id);
		return { t, on: m.on, locked: false, note: memberNote(m.on, t.inPool) };
	});
	const focusRow = rows.find((r) => r.t.id === focusId) ?? rows[0];

	return (
		<Surface open={open} onOpenChange={onOpenChange} width={EDITOR_WIDTH}>
			<header className="p-4 pr-14">
				<SurfaceTitle>Edit basket</SurfaceTitle>
			</header>
			<div className={cn("flex flex-col gap-3 px-4 pb-3", pushed && "@max-3xl:hidden")}>
				<div className="flex gap-1 overflow-x-auto">
					{PRESETS.map((p) => (
						<Pill
							key={p.key}
							on={preset === p.key}
							onClick={() => {
								onChange(presetMembers(p.key));
								setFocusId(null);
								toast.success(p.done);
							}}
						>
							{p.label}
						</Pill>
					))}
					{preset === "custom" && (
						<Pill on onClick={() => undefined}>
							Custom
						</Pill>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-12 bg-control p-3">
					<span className="flex flex-col">
						<span className="text-2xs text-fg-muted">Counting</span>
						<span className="text-sm font-medium tabular-nums">
							{ids.length} of {members.length}
						</span>
					</span>
					<span className="flex min-w-[180px] flex-1 flex-col gap-1.5">
						<span className="flex justify-between text-2xs text-fg-muted">
							<span>{MOOD_MARKET} mood</span>
							<span className="text-fg tabular-nums">
								{mood.score > 0 ? "+" : ""}
								{mood.score} {moodLabel(mood.score)}
							</span>
						</span>
						<MoodBar score={mood.score} />
					</span>
					<span className="flex gap-2">
						<Button
							variant="secondary"
							intent="neutral"
							size="sm"
							disabled={isDefault(members)}
							onClick={() => {
								onChange(defaultMembers());
								toast.success("Basket reset to the 37 pool traders.");
							}}
						>
							<ArrowCounterClockwiseIcon className="size-3.5" />
							Reset
						</Button>
						<Button variant="filled" intent="neutral" size="sm" onClick={() => show("add")}>
							<PlusIcon className="size-3.5" />
							Add traders
						</Button>
					</span>
				</div>
			</div>
			<TwoPane
				pushed={pushed}
				onBack={() => setPushed(false)}
				listClassName="min-w-0 flex-1"
				detailClassName="w-[400px] shrink-0"
				list={
					<TraderTable
						rows={rows}
						focusId={focusRow?.t.id}
						dimOff
						onToggle={toggle}
						onOpen={openRow}
						footer={
							!members.length && <p className="py-10 text-center text-xs text-fg-muted">No traders in the basket.</p>
						}
					/>
				}
				detail={
					focusRow && (
						<Detail
							key={focusRow.t.id}
							t={focusRow.t}
							Consistency={Consistency}
							actionLabel={focusRow.on ? "Turn off in basket" : "Turn on in basket"}
							onAction={() => toggle(focusRow.t.id)}
						/>
					)
				}
			/>
		</Surface>
	);
}

interface AddTradersProps {
	members: Member[];
	onChange: (next: Member[]) => void;
	onBack: () => void;
	focusId: string | null;
	pushed: boolean;
	onOpen: (id: string) => void;
	onBackFromDetail: () => void;
	Consistency: ConsistencyBlock;
}

function AddTraders({
	members,
	onChange,
	onBack,
	focusId,
	pushed,
	onOpen,
	onBackFromDetail,
	Consistency,
}: AddTradersProps) {
	const [adding, setAdding] = useState<Set<string>>(new Set());
	const [sort, setSort] = useState<TableSort>({ key: "pnl", dir: "desc" });
	const [text, setText] = useState("");
	const memberIds = new Set(members.map((m) => m.id));
	const pasted = isAddress(text);
	const list = pasted
		? [pastedTrader(text)]
		: queryDirectory({ sort: sort.key, window: "d30", dir: sort.dir, text: pasted ? "" : text });
	const rows = list.map((t) => {
		const locked = memberIds.has(t.id);
		return {
			t,
			on: locked || adding.has(t.id),
			locked,
			note: locked ? "In basket" : (t.style ?? `${usd(t.equity)} equity`),
		};
	});
	const focusRow = rows.find((r) => r.t.id === focusId) ?? rows.find((r) => !r.locked) ?? rows[0];

	function toggle(id: string) {
		setAdding((s) => {
			const next = new Set(s);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function addOne(t: DirTrader) {
		onChange([...members, { id: t.id, on: true }]);
		setAdding((s) => {
			const next = new Set(s);
			next.delete(t.id);
			return next;
		});
		toast.success(`Added ${t.name} to the basket.`);
	}

	return (
		<>
			<header className="flex flex-col gap-1 p-4 pr-14">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
				>
					<ArrowLeftIcon className="size-3.5" />
					Basket
				</button>
				<SurfaceTitle>Add traders</SurfaceTitle>
			</header>
			<div className={cn("px-4 pb-3", pushed && "@max-3xl:hidden")}>
				<label className="flex h-9 items-center gap-2 rounded-8 bg-control px-3">
					<MagnifyingGlassIcon className="size-4 text-fg-muted" />
					<input
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Search a name or paste an address"
						className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
					/>
				</label>
			</div>
			<TwoPane
				pushed={pushed}
				onBack={onBackFromDetail}
				listClassName="min-w-0 flex-1"
				detailClassName="w-[400px] shrink-0"
				list={
					<TraderTable
						rows={rows}
						focusId={focusRow?.t.id}
						dimOff={false}
						onToggle={toggle}
						onOpen={onOpen}
						sort={sort}
						onSort={(key) =>
							setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }))
						}
						footer={!rows.length && <p className="py-10 text-center text-xs text-fg-muted">No traders match.</p>}
					/>
				}
				detail={
					focusRow && (
						<Detail
							key={focusRow.t.id}
							t={focusRow.t}
							Consistency={Consistency}
							actionLabel={focusRow.locked ? "Already in basket" : "Add to basket"}
							actionDisabled={focusRow.locked}
							onAction={() => addOne(focusRow.t)}
						/>
					)
				}
			/>
			<div className="flex items-center justify-between gap-3 px-4 pt-2 pb-4">
				<span className="text-xs text-fg-muted">{adding.size} selected</span>
				<Button
					variant="filled"
					intent="brand"
					size="sm"
					disabled={!adding.size}
					onClick={() => {
						onChange([...members, ...[...adding].map((id) => ({ id, on: true }))]);
						toast.success(`Added ${adding.size} ${adding.size === 1 ? "trader" : "traders"} to the basket.`);
						setAdding(new Set());
						onBack();
					}}
				>
					Add {adding.size || ""} to basket
				</Button>
			</div>
		</>
	);
}
