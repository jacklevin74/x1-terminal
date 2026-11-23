import { Button } from "@hypeterminal/ui";
import {
	ArrowCounterClockwiseIcon,
	ArrowLeftIcon,
	CaretRightIcon,
	CheckIcon,
	MagnifyingGlassIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
	basketMood,
	byId,
	count,
	DEFAULT_BASKET,
	type DegenParts,
	type DirTrader,
	degenLabel,
	hypeSide,
	isAddress,
	MOOD_MARKET,
	moodLabel,
	pastedTrader,
	pnlTone,
	queryDirectory,
	SORT_KEYS,
	SORT_LABEL,
	type SortKey,
	sortValue,
	tradesText,
	usd,
	type VariantProps,
	WINDOW_LABEL,
	type Window,
} from "./data";
import { Identicon } from "./identicon";
import {
	AutoPanel,
	type BasketEditorProps,
	type DirectoryProps,
	defaultMembers,
	isDefault,
	MoodBar,
	onIds,
	Surface,
	SurfaceTitle,
} from "./panel";

export default function V3(props: VariantProps & { edited?: boolean }) {
	return <AutoPanel {...props} Directory={Directory} BasketEditor={BasketEditor} />;
}

const WIDTH = "max-w-[960px]";

function sortText(t: DirTrader, key: SortKey, window: Window) {
	if (key === "pnl") return usd(t.pnl[window], true);
	if (key === "trades") return tradesText(t);
	const v = sortValue(t, key, window);
	return v === null ? "n/a" : String(v);
}

interface BrowserProps {
	multi: boolean;
	checked: ReadonlySet<string>;
	locked: ReadonlySet<string>;
	pickedId: string | null;
	onAction: (t: DirTrader) => void;
}

function Browser({ multi, checked, locked, pickedId, onAction }: BrowserProps) {
	const [sort, setSort] = useState<SortKey>("consistency");
	const [window, setWindow] = useState<Window>("d30");
	const [text, setText] = useState("");
	const pasted = isAddress(text);
	const list = pasted ? [pastedTrader(text)] : queryDirectory({ sort, window, text });
	const [focusId, setFocusId] = useState<string | null>(null);
	const [mobileDetail, setMobileDetail] = useState(false);
	const focus = list.find((t) => t.id === (focusId ?? pickedId)) ?? list.find((t) => t.inPool) ?? list[0];

	return (
		<div className="flex min-h-0 flex-1 gap-0 @max-3xl:flex-col">
			<div
				className={cn(
					"flex min-h-0 w-[340px] shrink-0 flex-col gap-2 pl-4 @max-3xl:w-full @max-3xl:flex-1 @max-3xl:pr-4",
					mobileDetail && "@max-3xl:hidden",
				)}
			>
				<label className="flex h-9 items-center gap-2 rounded-8 bg-control px-3">
					<MagnifyingGlassIcon className="size-4 text-fg-muted" />
					<input
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Search or paste an address"
						className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
					/>
				</label>
				<div className="flex gap-1 overflow-x-auto">
					{SORT_KEYS.map((k) => (
						<Pill key={k} on={sort === k} onClick={() => setSort(k)}>
							{SORT_LABEL[k]}
						</Pill>
					))}
				</div>
				{sort === "pnl" && (
					<div className="flex gap-1">
						{(Object.keys(WINDOW_LABEL) as Window[]).map((w) => (
							<Pill key={w} on={window === w} onClick={() => setWindow(w)} quiet>
								{WINDOW_LABEL[w]}
							</Pill>
						))}
					</div>
				)}
				<div className="min-h-0 flex-1 overflow-y-auto pb-4">
					{list.map((t, i) => {
						const isLocked = locked.has(t.id);
						const on = checked.has(t.id) || isLocked;
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => {
									setFocusId(t.id);
									setMobileDetail(true);
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
										{isLocked ? "In basket" : `Degen ${t.degen}, consistency ${t.consistency}`}
									</span>
								</span>
								<span className={cn("tabular-nums", sort === "pnl" && pnlTone(t.pnl[window]))}>
									{sortText(t, sort, window)}
								</span>
								{multi && on && (
									<span
										className={cn(
											"grid size-4 place-items-center rounded-full",
											isLocked ? "bg-control-hover text-fg-muted" : "bg-brand text-fg-inverse",
										)}
									>
										<CheckIcon weight="bold" className="size-2.5" />
									</span>
								)}
								{pickedId === t.id && <CheckIcon weight="bold" className="size-3.5" />}
								<CaretRightIcon className="hidden size-3 text-fg-muted @max-3xl:block" />
							</button>
						);
					})}
					{!list.length && <p className="py-10 text-center text-xs text-fg-muted">No traders match.</p>}
				</div>
			</div>
			<div className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-4", !mobileDetail && "@max-3xl:hidden")}>
				{mobileDetail && (
					<button
						type="button"
						onClick={() => setMobileDetail(false)}
						className="mb-3 hidden items-center gap-1.5 text-xs text-fg-muted @max-3xl:flex"
					>
						<ArrowLeftIcon className="size-3.5" />
						All traders
					</button>
				)}
				{focus && (
					<Detail
						t={focus}
						actionLabel={actionLabelOf(multi, checked.has(focus.id), locked.has(focus.id))}
						actionDisabled={locked.has(focus.id)}
						onAction={() => onAction(focus)}
					/>
				)}
			</div>
		</div>
	);
}

function Pill({
	on,
	quiet,
	onClick,
	children,
}: {
	on: boolean;
	quiet?: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"h-7 shrink-0 rounded-full px-2.5 text-xs transition-colors",
				on && !quiet && "bg-fill text-fg-inverse",
				on && quiet && "bg-control-hover text-fg",
				!on && "bg-control text-fg-secondary hover:bg-control-hover",
			)}
		>
			{children}
		</button>
	);
}

function actionLabelOf(multi: boolean, checked: boolean, locked: boolean) {
	if (!multi) return "Copy this trader";
	if (locked) return "Already in basket";
	return checked ? "Remove from selection" : "Add to selection";
}

const PART_LABEL: Record<keyof DegenParts, string> = {
	size: "Position size",
	leverage: "Leverage",
	swing: "Biggest swing",
	concentration: "PNL in one period",
	fewTrades: "Few trades",
};

function Detail({
	t,
	actionLabel,
	actionDisabled,
	onAction,
}: {
	t: DirTrader;
	actionLabel: string;
	actionDisabled: boolean;
	onAction: () => void;
}) {
	const months = t.months ?? [];
	const maxMonth = Math.max(1, ...months.map((m) => Math.abs(m.pnl)));
	return (
		<div key={t.id} className="flex animate-[ct3-in_160ms_ease-out] flex-col gap-4 rounded-12 bg-control p-4">
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
				{(Object.keys(WINDOW_LABEL) as Window[]).map((w) => (
					<span key={w} className="flex flex-col gap-0.5 rounded-8 bg-control-hover px-3 py-2">
						<span className="text-2xs text-fg-muted">PNL {WINDOW_LABEL[w]}</span>
						<span className={cn("text-xs font-medium tabular-nums", pnlTone(t.pnl[w]))}>{usd(t.pnl[w], true)}</span>
					</span>
				))}
			</div>
			<div className="grid grid-cols-2 gap-4 @max-3xl:grid-cols-1">
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
								<span className="h-1.5 rounded-full bg-control-hover">
									{v !== null && (
										<span className="block h-full rounded-full bg-fg-secondary" style={{ width: `${v * 100}%` }} />
									)}
								</span>
								<span className="text-right tabular-nums">{v === null ? "n/a" : Math.round(v * 100)}</span>
							</span>
						);
					})}
				</div>
				<div className="flex flex-col gap-2">
					<span className="flex items-baseline justify-between text-xs">
						<span className="text-fg-muted">Consistency</span>
						<span className="tabular-nums">{t.consistency}</span>
					</span>
					{months.length ? (
						<div className="flex h-[76px] items-center gap-2">
							{months.map((m) => (
								<span key={m.m} className="flex h-full flex-1 flex-col items-center gap-1">
									<span className="relative w-full flex-1">
										<span className="absolute inset-x-0 top-1/2 h-px bg-control-hover" />
										<span
											className={cn(
												"absolute inset-x-1 rounded-4",
												m.pnl >= 0 ? "bottom-1/2 bg-market-up" : "top-1/2 bg-market-down",
											)}
											style={{ height: `${(Math.abs(m.pnl) / maxMonth) * 50}%` }}
										/>
									</span>
									<span className="text-2xs text-fg-muted">{m.m}</span>
								</span>
							))}
						</div>
					) : (
						<p className="text-2xs text-fg-muted">
							No monthly PNL in the snapshot. Score from the 7d, 30d and all-time windows.
						</p>
					)}
					<span className="flex justify-between text-2xs">
						<span className="text-fg-muted">Trades a day (14d)</span>
						<span className="tabular-nums">{tradesText(t)}</span>
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
							<span>{p.coin.replace(/^xyz:/, "")}</span>
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

function Directory({ open, onOpenChange, pickedId, onPick }: DirectoryProps) {
	return (
		<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
			<header className="p-4 pr-14">
				<SurfaceTitle>Trader directory</SurfaceTitle>
			</header>
			<Browser
				multi={false}
				checked={new Set()}
				locked={new Set()}
				pickedId={pickedId}
				onAction={(t) => {
					onPick(t);
					toast.success(`Selected ${t.name}.`);
				}}
			/>
		</Surface>
	);
}

function BasketEditor({ open, onOpenChange, members, onChange, startInAdd }: BasketEditorProps) {
	const [view, setView] = useState<"list" | "add">(startInAdd ? "add" : "list");
	const [adding, setAdding] = useState<Set<string>>(new Set());
	const ids = onIds(members);
	const mood = basketMood(ids);
	const removed = members.filter((m) => !m.on && DEFAULT_BASKET.includes(m.id)).length;
	const added = members.filter((m) => m.on && !DEFAULT_BASKET.includes(m.id)).length;

	if (view === "add")
		return (
			<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
				<header className="flex flex-col gap-1 p-4 pr-14">
					<button
						type="button"
						onClick={() => setView("list")}
						className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
					>
						<ArrowLeftIcon className="size-3.5" />
						Basket
					</button>
					<SurfaceTitle>Add traders</SurfaceTitle>
				</header>
				<Browser
					multi
					checked={adding}
					locked={new Set(members.map((m) => m.id))}
					pickedId={null}
					onAction={(t) =>
						setAdding((s) => {
							const next = new Set(s);
							if (next.has(t.id)) next.delete(t.id);
							else next.add(t.id);
							return next;
						})
					}
				/>
				<div className="flex items-center justify-between gap-3 bg-control px-4 py-3">
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
							setView("list");
						}}
					>
						Add {adding.size || ""} to basket
					</Button>
				</div>
			</Surface>
		);

	return (
		<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
			<header className="p-4 pr-14">
				<SurfaceTitle>Edit basket</SurfaceTitle>
			</header>
			<div className="flex min-h-0 flex-1 @max-3xl:flex-col-reverse">
				<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
					{members.map((m) => {
						const t = byId.get(m.id) ?? pastedTrader(m.id);
						const side = hypeSide(t.id);
						return (
							<button
								key={m.id}
								type="button"
								onClick={() => onChange(members.map((x) => (x.id === m.id ? { ...x, on: !x.on } : x)))}
								className="flex w-full items-center gap-3 rounded-8 px-2 py-2 text-left text-xs transition-colors hover:bg-control"
							>
								<Identicon id={t.id} className={cn("size-7", !m.on && "opacity-40 grayscale")} />
								<span className="flex min-w-0 flex-1 flex-col">
									<span className={cn("truncate font-medium", !m.on && "text-fg-muted")}>{t.name}</span>
									<span className="truncate text-2xs text-fg-muted">
										{t.inPool ? "Pool" : "Added"}, degen {t.degen}
										{side ? `, ${side.toLowerCase()} ${MOOD_MARKET}` : ""}
									</span>
								</span>
								<span className={cn("w-8 text-right text-2xs", m.on ? "text-fg" : "text-fg-muted")}>
									{m.on ? "On" : "Off"}
								</span>
								<span
									className={cn(
										"flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
										m.on ? "bg-brand" : "bg-control-hover",
									)}
								>
									<span
										className={cn(
											"size-4 rounded-full transition-transform",
											m.on ? "translate-x-4 bg-background" : "bg-fg-muted",
										)}
									/>
								</span>
							</button>
						);
					})}
				</div>
				<div className="flex w-[320px] shrink-0 flex-col gap-3 px-4 pb-4 @max-3xl:w-full">
					<div className="flex flex-col gap-3 rounded-12 bg-control p-4">
						<span className="text-2xs tracking-micro text-fg-muted uppercase">{MOOD_MARKET} mood of this basket</span>
						<span
							className={cn(
								"text-lg font-medium tabular-nums",
								mood.score >= 15 && "text-market-up",
								mood.score <= -15 && "text-market-down",
							)}
						>
							{mood.score > 0 ? "+" : ""}
							{mood.score} {moodLabel(mood.score)}
						</span>
						<MoodBar score={mood.score} />
						<span className="grid grid-cols-3 gap-2 text-xs @max-3xl:hidden">
							<Mini label="On" value={`${ids.length}/${members.length}`} />
							<Mini label="Long" value={String(mood.longCount)} />
							<Mini label="Short" value={String(mood.shortCount)} />
						</span>
						<span className="text-2xs text-fg-muted">
							{removed} removed, {added} added since the default 37.
						</span>
					</div>
					<div className="grid grid-cols-2 gap-2">
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
						<Button variant="filled" intent="neutral" size="sm" onClick={() => setView("add")}>
							<PlusIcon className="size-3.5" />
							Add traders
						</Button>
					</div>
				</div>
			</div>
		</Surface>
	);
}

function Mini({ label, value }: { label: string; value: string }) {
	return (
		<span className="flex flex-col gap-0.5 rounded-8 bg-control-hover px-2 py-1.5">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className="tabular-nums">{value}</span>
		</span>
	);
}
