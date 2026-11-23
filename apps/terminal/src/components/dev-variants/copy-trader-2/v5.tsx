import { Button } from "@hypeterminal/ui";
import {
	ArrowCounterClockwiseIcon,
	ArrowLeftIcon,
	CheckIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	ScalesIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
	basketMood,
	byId,
	count,
	DEFAULT_BASKET,
	type DirTrader,
	isAddress,
	MOOD_MARKET,
	moodLabel,
	pastedTrader,
	pnlTone,
	queryDirectory,
	SORT_KEYS,
	SORT_LABEL,
	type SortKey,
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
	type Member,
	MoodBar,
	onIds,
	StageContext,
	Surface,
	SurfaceTitle,
} from "./panel";

export default function V5(props: VariantProps & { edited?: boolean }) {
	return <AutoPanel {...props} Directory={Directory} BasketEditor={BasketEditor} />;
}

const WIDTH = "max-w-[960px]";
const MAX_COMPARE = 3;
/** Gallery desktop stage only: opens on a compare of a steady, a consistent high-degen and a hail mary trader. */
const DEMO_COMPARE = [
	"0x1081e214bd6f0137234b92432d9b6033b88965b7",
	"0xf220c9b7b4c0e5e785ebe4b40b17576ce24473e0",
	"0x541e077ac38c56d7bf590924d249c60b0c80071d",
];

interface Row {
	label: string;
	value: (t: DirTrader) => number | null;
	text: (t: DirTrader) => string;
	tone?: (t: DirTrader) => string;
}

const ROWS: Row[] = [
	{ label: "PNL 7d", value: (t) => t.pnl.d7, text: (t) => usd(t.pnl.d7, true), tone: (t) => pnlTone(t.pnl.d7) },
	{ label: "PNL 30d", value: (t) => t.pnl.d30, text: (t) => usd(t.pnl.d30, true), tone: (t) => pnlTone(t.pnl.d30) },
	{
		label: "PNL all time",
		value: (t) => t.pnl.all,
		text: (t) => usd(t.pnl.all, true),
		tone: (t) => pnlTone(t.pnl.all),
	},
	{ label: "Equity", value: (t) => t.equity, text: (t) => usd(t.equity) },
	{ label: "Trades a day", value: (t) => t.tradesDay, text: tradesText },
	{ label: "Consistency", value: (t) => t.consistency, text: (t) => String(t.consistency) },
	{
		label: "Degen score",
		value: (t) => t.degen,
		text: (t) => `${t.degen}${t.degenInputs < 5 ? ` (${t.degenInputs}/5)` : ""}`,
	},
	{ label: "Max leverage", value: (t) => t.maxLev, text: (t) => (t.maxLev === null ? "n/a" : `${t.maxLev}x`) },
	{
		label: "Open size / equity",
		value: (t) => t.exposure,
		text: (t) => (t.exposure === null ? "n/a" : `${t.exposure.toFixed(1)}x`),
	},
	{ label: "Followers (example)", value: (t) => t.followers, text: (t) => count(t.followers) },
];

interface PickerProps {
	multi: boolean;
	checked: ReadonlySet<string>;
	locked: ReadonlySet<string>;
	pickedId: string | null;
	onChoose: (t: DirTrader) => void;
}

function Picker({ multi, checked, locked, pickedId, onChoose }: PickerProps) {
	const [sort, setSort] = useState<SortKey>("pnl");
	const [window, setWindow] = useState<Window>("d30");
	const [text, setText] = useState("");
	const demo = useContext(StageContext)?.kind === "desktop" && !multi;
	const [compare, setCompare] = useState<string[]>(demo ? DEMO_COMPARE : []);
	const [comparing, setComparing] = useState(demo);
	const pasted = isAddress(text);
	const list = pasted ? [pastedTrader(text)] : queryDirectory({ sort, window, text });

	function flipCompare(id: string) {
		setCompare((c) => {
			if (c.includes(id)) return c.filter((x) => x !== id);
			if (c.length >= MAX_COMPARE) {
				toast.error(`Compare up to ${MAX_COMPARE} traders.`);
				return c;
			}
			return [...c, id];
		});
	}

	if (comparing && compare.length >= 2) {
		const ts = compare.map((id) => byId.get(id) ?? pastedTrader(id));
		return (
			<div className="flex min-h-0 flex-1 animate-[ct5-in_160ms_ease-out] flex-col gap-3 px-4 pb-4">
				<style>{"@keyframes ct5-in{from{opacity:0;transform:scale(.97)}}"}</style>
				<button
					type="button"
					onClick={() => setComparing(false)}
					className="flex items-center gap-1.5 self-start text-xs text-fg-muted hover:text-fg"
				>
					<ArrowLeftIcon className="size-3.5" />
					Back to list
				</button>
				<div className="min-h-0 flex-1 overflow-auto">
					<div
						className="grid min-w-max gap-x-2 text-xs tabular-nums"
						style={{ gridTemplateColumns: `128px repeat(${ts.length}, minmax(140px, 1fr))` }}
					>
						<span />
						{ts.map((t) => (
							<span key={t.id} className="flex flex-col items-start gap-2 rounded-t-12 bg-control p-3">
								<Identicon id={t.id} className="size-9" />
								<span className="w-full truncate font-medium">{t.name}</span>
								<span className="line-clamp-2 min-h-8 text-2xs text-fg-muted">{t.style ?? "Leaderboard trader"}</span>
							</span>
						))}
						{ROWS.map((r) => {
							const vals = ts.map(r.value).filter((v): v is number => v !== null);
							const top = vals.length > 1 ? Math.max(...vals) : null;
							return [
								<span key={r.label} className="py-2 text-fg-muted">
									{r.label}
								</span>,
								...ts.map((t) => {
									const v = r.value(t);
									return (
										<span
											key={`${r.label}-${t.id}`}
											className={cn(
												"flex items-center justify-between bg-control px-3 py-2",
												top !== null && v === top && "bg-control-hover",
											)}
										>
											<span className={cn(r.tone?.(t), v === null && "text-fg-muted")}>{r.text(t)}</span>
											{top !== null && v === top && <span className="text-2xs text-fg-muted">Highest</span>}
										</span>
									);
								}),
							];
						})}
						<span />
						{ts.map((t) => (
							<span key={`go-${t.id}`} className="rounded-b-12 bg-control p-3">
								<Button
									variant="filled"
									intent={multi ? "neutral" : "brand"}
									size="sm"
									className="w-full"
									disabled={locked.has(t.id)}
									onClick={() => onChoose(t)}
								>
									{chooseLabel(multi, checked.has(t.id), locked.has(t.id))}
								</Button>
							</span>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2 px-4">
				<label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-8 bg-control px-3 @max-3xl:basis-full">
					<MagnifyingGlassIcon className="size-4 text-fg-muted" />
					<input
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Search a name or paste an address"
						className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
					/>
				</label>
				<span className="flex gap-1 overflow-x-auto">
					{SORT_KEYS.map((k) => (
						<button
							key={k}
							type="button"
							onClick={() => setSort(k)}
							className={cn(
								"h-8 shrink-0 rounded-8 px-2.5 text-xs transition-colors",
								sort === k ? "bg-control-hover text-fg" : "bg-control text-fg-muted hover:text-fg",
							)}
						>
							{SORT_LABEL[k]}
						</button>
					))}
				</span>
				{sort === "pnl" && (
					<span className="flex gap-1">
						{(Object.keys(WINDOW_LABEL) as Window[]).map((w) => (
							<button
								key={w}
								type="button"
								onClick={() => setWindow(w)}
								className={cn(
									"h-8 rounded-8 px-2.5 text-xs transition-colors",
									window === w ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
								)}
							>
								{WINDOW_LABEL[w]}
							</button>
						))}
					</span>
				)}
			</div>
			<div className="grid grid-cols-[minmax(0,1fr)_88px_72px_72px_64px_104px] gap-3 px-6 text-2xs text-fg-muted @max-3xl:grid-cols-[minmax(0,1fr)_72px_104px]">
				<span>Trader</span>
				<span className="text-right">PNL {WINDOW_LABEL[window]}</span>
				<span className="text-right @max-3xl:hidden">Trades/day</span>
				<span className="text-right @max-3xl:hidden">Consistency</span>
				<span className="text-right @max-3xl:hidden">Degen</span>
				<span />
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-4">
				{list.map((t) => {
					const isLocked = locked.has(t.id);
					const on = checked.has(t.id) || t.id === pickedId;
					const inCompare = compare.includes(t.id);
					return (
						<div
							key={t.id}
							className={cn(
								"grid grid-cols-[minmax(0,1fr)_88px_72px_72px_64px_104px] items-center gap-3 rounded-8 px-2 text-xs tabular-nums transition-colors @max-3xl:grid-cols-[minmax(0,1fr)_72px_104px]",
								on || inCompare ? "bg-control" : "hover:bg-control",
							)}
						>
							<button
								type="button"
								disabled={isLocked}
								onClick={() => onChoose(t)}
								className="flex min-w-0 items-center gap-2.5 py-2 text-left"
							>
								<Identicon id={t.id} className={cn("size-7", isLocked && "opacity-40")} />
								<span className="flex min-w-0 flex-col">
									<span className="truncate font-medium">{t.name}</span>
									<span className="truncate text-2xs text-fg-muted">{rowNote(multi, on, isLocked, t)}</span>
								</span>
							</button>
							<span className={cn("text-right", pnlTone(t.pnl[window]))}>{usd(t.pnl[window], true)}</span>
							<span className="text-right @max-3xl:hidden">{tradesText(t)}</span>
							<span className="text-right @max-3xl:hidden">{t.consistency}</span>
							<span className="text-right @max-3xl:hidden">{t.degen}</span>
							<span className="flex justify-end">
								<button
									type="button"
									onClick={() => flipCompare(t.id)}
									className={cn(
										"inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs transition-colors",
										inCompare ? "bg-fill text-fg-inverse" : "bg-control-hover text-fg-secondary hover:text-fg",
									)}
								>
									{inCompare ? <CheckIcon weight="bold" className="size-3" /> : <PlusIcon className="size-3" />}
									{inCompare ? "Comparing" : "Compare"}
								</button>
							</span>
						</div>
					);
				})}
				{!list.length && <p className="py-10 text-center text-xs text-fg-muted">No traders match.</p>}
			</div>
			<div className="flex items-center gap-3 bg-control px-4 py-3">
				<span className="flex flex-1 items-center gap-2">
					<ScalesIcon className="size-4 text-fg-muted" />
					{compare.length ? (
						<span className="flex items-center gap-1">
							{compare.map((id) => (
								<button
									key={id}
									type="button"
									onClick={() => flipCompare(id)}
									aria-label="Remove from compare"
									className="group relative"
								>
									<Identicon id={id} className="size-6" />
									<span className="absolute -top-1 -right-1 hidden size-3.5 place-items-center rounded-full bg-fill text-fg-inverse group-hover:grid">
										<XIcon weight="bold" className="size-2" />
									</span>
								</button>
							))}
							<span className="pl-1 text-xs text-fg-muted">
								{compare.length} of {MAX_COMPARE}
							</span>
						</span>
					) : (
						<span className="text-xs text-fg-muted">Add 2 or 3 traders to compare them side by side.</span>
					)}
				</span>
				<Button
					variant="filled"
					intent="neutral"
					size="sm"
					disabled={compare.length < 2}
					onClick={() => setComparing(true)}
				>
					Compare
				</Button>
			</div>
		</div>
	);
}

function chooseLabel(multi: boolean, checked: boolean, locked: boolean) {
	if (!multi) return "Copy";
	if (locked) return "In basket";
	return checked ? "Selected" : "Select";
}

function rowNote(multi: boolean, on: boolean, locked: boolean, t: DirTrader) {
	if (locked) return "In basket";
	if (multi && on) return "Selected to add";
	return t.style ?? `${usd(t.equity)} equity`;
}

function Directory({ open, onOpenChange, pickedId, onPick }: DirectoryProps) {
	return (
		<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
			<header className="flex flex-col gap-1 p-4 pr-14">
				<SurfaceTitle>Trader directory</SurfaceTitle>
				<span className="text-xs text-fg-muted">Tap a name to copy, or add traders to compare first.</span>
			</header>
			<Picker
				multi={false}
				checked={new Set()}
				locked={new Set()}
				pickedId={pickedId}
				onChoose={(t) => {
					onPick(t);
					toast.success(`Selected ${t.name}.`);
				}}
			/>
		</Surface>
	);
}

function avg(ids: string[], f: (t: DirTrader) => number) {
	const ts = ids.map((id) => byId.get(id)).filter((t): t is DirTrader => !!t);
	return ts.length ? Math.round(ts.reduce((a, t) => a + f(t), 0) / ts.length) : 0;
}

function BasketEditor({ open, onOpenChange, members, onChange, startInAdd }: BasketEditorProps) {
	const [view, setView] = useState<"list" | "add">(startInAdd ? "add" : "list");
	const [adding, setAdding] = useState<Set<string>>(new Set());
	const ids = onIds(members);
	const before = basketMood(DEFAULT_BASKET);
	const after = basketMood(ids);
	const removed = members.filter((m) => !m.on && DEFAULT_BASKET.includes(m.id));
	const added = members.filter((m) => !DEFAULT_BASKET.includes(m.id));

	function set(id: string, on: boolean) {
		onChange(members.map((m) => (m.id === id ? { ...m, on } : m)));
	}

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
					<SurfaceTitle>Add traders {adding.size ? `(${adding.size} selected)` : ""}</SurfaceTitle>
				</header>
				<Picker
					multi
					checked={adding}
					locked={new Set(members.map((m) => m.id))}
					pickedId={null}
					onChoose={(t) =>
						setAdding((s) => {
							const next = new Set(s);
							if (next.has(t.id)) next.delete(t.id);
							else next.add(t.id);
							return next;
						})
					}
				/>
				<div className="flex justify-end px-4 py-3">
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
			<header className="flex flex-col gap-1 p-4 pr-14">
				<SurfaceTitle>Edit basket</SurfaceTitle>
				<span className="text-xs text-fg-muted">Default pool on the left, your basket on the right.</span>
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
				<div className="grid grid-cols-2 gap-2">
					<Side
						title="Default"
						traders={DEFAULT_BASKET.length}
						mood={before.score}
						long={before.longCount}
						short={before.shortCount}
						degen={avg(DEFAULT_BASKET, (t) => t.degen)}
						consistency={avg(DEFAULT_BASKET, (t) => t.consistency)}
					/>
					<Side
						title="Your basket"
						traders={ids.length}
						mood={after.score}
						long={after.longCount}
						short={after.shortCount}
						degen={avg(ids, (t) => t.degen)}
						consistency={avg(ids, (t) => t.consistency)}
						strong
					/>
				</div>
				<div className="mt-2 grid grid-cols-2 gap-2 @max-3xl:grid-cols-1">
					<ChangeList
						title={`Removed (${removed.length})`}
						empty="Nobody removed."
						members={removed}
						action="Undo"
						onAction={(id) => set(id, true)}
					/>
					<ChangeList
						title={`Added (${added.length})`}
						empty="Nobody added."
						members={added}
						action="Remove"
						onAction={(id) => onChange(members.filter((m) => m.id !== id))}
					/>
				</div>
				<div className="mt-4 flex flex-col">
					<span className="pb-2 text-2xs tracking-micro text-fg-muted uppercase">
						All {members.length}, tap to turn off or on
					</span>
					<div className="flex flex-wrap gap-1">
						{members.map((m) => {
							const t = byId.get(m.id) ?? pastedTrader(m.id);
							return (
								<button
									key={m.id}
									type="button"
									onClick={() => set(m.id, !m.on)}
									className={cn(
										"inline-flex h-8 items-center gap-1.5 rounded-full pr-3 pl-1 text-xs transition-colors",
										m.on ? "bg-control-hover text-fg" : "bg-surface text-fg-muted line-through",
									)}
								>
									<Identicon id={t.id} className={cn("size-6", !m.on && "opacity-40 grayscale")} />
									{t.name}
								</button>
							);
						})}
					</div>
				</div>
			</div>
			<div className="flex items-center justify-end gap-2 bg-control px-4 py-3">
				<Button
					variant="secondary"
					intent="neutral"
					size="sm"
					className="bg-control-hover"
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
		</Surface>
	);
}

function Side({
	title,
	traders,
	mood,
	long,
	short,
	degen,
	consistency,
	strong,
}: {
	title: string;
	traders: number;
	mood: number;
	long: number;
	short: number;
	degen: number;
	consistency: number;
	strong?: boolean;
}) {
	return (
		<div className={cn("flex flex-col gap-3 rounded-12 p-3", strong ? "bg-control-hover" : "bg-control")}>
			<span className="flex items-baseline justify-between gap-2">
				<span className="text-xs font-medium">{title}</span>
				<span className="text-2xs text-fg-muted">{traders} traders</span>
			</span>
			<span
				className={cn(
					"text-lg font-medium tabular-nums",
					mood >= 15 && "text-market-up",
					mood <= -15 && "text-market-down",
				)}
			>
				{mood > 0 ? "+" : ""}
				{mood}
				<span className="pl-1.5 text-xs font-normal text-fg-muted">
					{MOOD_MARKET} {moodLabel(mood).toLowerCase()}
				</span>
			</span>
			<MoodBar score={mood} />
			<span className="grid grid-cols-2 gap-x-3 gap-y-1 text-2xs tabular-nums @max-3xl:grid-cols-1">
				<span className="flex justify-between">
					<span className="text-fg-muted">Long / short</span>
					{long} / {short}
				</span>
				<span className="flex justify-between">
					<span className="text-fg-muted">Avg degen</span>
					{degen}
				</span>
				<span className="flex justify-between">
					<span className="text-fg-muted">Avg consistency</span>
					{consistency}
				</span>
			</span>
		</div>
	);
}

function ChangeList({
	title,
	empty,
	members,
	action,
	onAction,
}: {
	title: string;
	empty: string;
	members: Member[];
	action: string;
	onAction: (id: string) => void;
}) {
	return (
		<div className="flex flex-col gap-1 rounded-12 bg-control p-3">
			<span className="pb-1 text-xs font-medium">{title}</span>
			{members.length ? (
				members.map((m) => {
					const t = byId.get(m.id) ?? pastedTrader(m.id);
					return (
						<span key={m.id} className="flex items-center gap-2 text-xs">
							<Identicon id={t.id} className="size-6" />
							<span className="min-w-0 flex-1 truncate">{t.name}</span>
							<span className="text-2xs text-fg-muted tabular-nums">Degen {t.degen}</span>
							<button
								type="button"
								onClick={() => onAction(m.id)}
								className="h-7 rounded-full bg-control-hover px-2.5 text-xs text-fg-secondary hover:text-fg"
							>
								{action}
							</button>
						</span>
					);
				})
			) : (
				<span className="text-2xs text-fg-muted">{empty}</span>
			)}
		</div>
	);
}
