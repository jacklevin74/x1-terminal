import { Button } from "@hypeterminal/ui";
import {
	ArrowCounterClockwiseIcon,
	ArrowLeftIcon,
	CaretDownIcon,
	CaretUpIcon,
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
	type DirTrader,
	hypeSide,
	isAddress,
	MOOD_MARKET,
	memberNote,
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
	MoodBar,
	onIds,
	Surface,
	SurfaceTitle,
} from "./panel";

export default function V1(props: VariantProps & { edited?: boolean }) {
	return <AutoPanel {...props} Directory={Directory} BasketEditor={BasketEditor} />;
}

const WIDTH = "max-w-[920px]";
const COLS =
	"grid grid-cols-[20px_minmax(0,1fr)_84px_64px_80px_80px_64px] @max-3xl:grid-cols-[minmax(0,1fr)_72px_56px] items-center gap-3";
const COLS_MULTI =
	"grid grid-cols-[16px_20px_minmax(0,1fr)_84px_64px_80px_80px_64px] @max-3xl:grid-cols-[16px_minmax(0,1fr)_72px_56px] items-center gap-3";

interface Sort {
	key: SortKey;
	dir: "desc" | "asc";
}

interface TableProps {
	multi: boolean;
	checked: ReadonlySet<string>;
	locked: ReadonlySet<string>;
	pickedId: string | null;
	onRow: (t: DirTrader) => void;
}

function Table({ multi, checked, locked, pickedId, onRow }: TableProps) {
	const [sort, setSort] = useState<Sort>({ key: "pnl", dir: "desc" });
	const [window, setWindow] = useState<Window>("d30");
	const [text, setText] = useState("");
	const pasted = isAddress(text);
	const rows = queryDirectory({ sort: sort.key, window, dir: sort.dir, text: pasted ? "" : text });
	const pastedRow = pasted ? pastedTrader(text) : null;

	function head(key: Sort["key"]) {
		setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
	}

	const cols = multi ? COLS_MULTI : COLS;
	const list = pastedRow ? [pastedRow] : rows;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-2">
			<div className="flex flex-wrap items-center gap-2">
				<label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-8 bg-control px-3 @max-3xl:basis-full">
					<MagnifyingGlassIcon className="size-4 text-fg-muted" />
					<input
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Search a name or paste an address"
						className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
					/>
				</label>
				<div className="flex h-9 items-center gap-0.5 rounded-8 bg-control p-1">
					<span className="px-2 text-xs text-fg-muted">PNL</span>
					{(Object.keys(WINDOW_LABEL) as Window[]).map((w) => (
						<button
							key={w}
							type="button"
							onClick={() => setWindow(w)}
							className={cn(
								"h-7 rounded-6 px-2.5 text-xs transition-colors",
								window === w ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
							)}
						>
							{WINDOW_LABEL[w]}
						</button>
					))}
				</div>
			</div>
			<div className="flex gap-1 overflow-x-auto @3xl:hidden">
				{SORT_KEYS.map((k) => (
					<button
						key={k}
						type="button"
						onClick={() => head(k)}
						className={cn(
							"inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs",
							sort.key === k ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary",
						)}
					>
						{SORT_LABEL[k]}
						{sort.key === k && <Caret dir={sort.dir} />}
					</button>
				))}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className={cn(cols, "sticky top-0 z-10 bg-overlay px-2 pb-2 text-2xs text-fg-muted")}>
					{multi && <span />}
					<span className="@max-3xl:hidden">#</span>
					<span>Trader</span>
					<Head on={sort.key === "pnl"} dir={sort.dir} onClick={() => head("pnl")}>
						PNL {WINDOW_LABEL[window]}
					</Head>
					<Head on={sort.key === "trades"} dir={sort.dir} onClick={() => head("trades")} className="@max-3xl:hidden">
						Trades/day
					</Head>
					<Head
						on={sort.key === "consistency"}
						dir={sort.dir}
						onClick={() => head("consistency")}
						className="@max-3xl:hidden"
					>
						Consistency
					</Head>
					<Head on={sort.key === "degen"} dir={sort.dir} onClick={() => head("degen")}>
						Degen
					</Head>
					<Head
						on={sort.key === "followers"}
						dir={sort.dir}
						onClick={() => head("followers")}
						className="@max-3xl:hidden"
					>
						Followers
					</Head>
				</div>
				{list.map((t, i) => {
					const isLocked = locked.has(t.id);
					const on = checked.has(t.id) || isLocked;
					return (
						<button
							key={t.id}
							type="button"
							disabled={isLocked}
							onClick={() => onRow(t)}
							className={cn(
								cols,
								"w-full rounded-8 px-2 py-2 text-left text-xs tabular-nums transition-colors",
								t.id === pickedId || (multi && on) ? "bg-control" : "hover:bg-control",
								isLocked && "cursor-default",
							)}
						>
							{multi && <Check on={on} muted={isLocked} />}
							<span className="text-fg-muted @max-3xl:hidden">{i + 1}</span>
							<span className="flex min-w-0 items-center gap-2.5">
								<Identicon id={t.id} className="size-7" />
								<span className="flex min-w-0 flex-col">
									<span className="truncate font-medium">{t.name}</span>
									<span className="truncate text-2xs text-fg-muted">
										{isLocked ? "In basket" : (t.style ?? `${usd(t.equity)} equity`)}
									</span>
								</span>
							</span>
							<span className={cn("text-right", pnlTone(t.pnl[window]))}>{usd(t.pnl[window], true)}</span>
							<span className={cn("text-right @max-3xl:hidden", t.tradesDay === null && "text-fg-muted")}>
								{tradesText(t)}
							</span>
							<Meter value={t.consistency} className="@max-3xl:hidden" />
							<Meter value={t.degen} hint={t.degenInputs < 5 ? `${t.degenInputs}/5` : undefined} />
							<span className="text-right text-fg-secondary @max-3xl:hidden">{count(t.followers)}</span>
						</button>
					);
				})}
				{pastedRow && !byId.has(pastedRow.id) && (
					<p className="px-2 py-3 text-2xs text-fg-muted">
						Not in the snapshot. The bot can still copy it; stats load after you pick it.
					</p>
				)}
				{!list.length && <p className="py-10 text-center text-xs text-fg-muted">No traders match.</p>}
			</div>
			<p className="text-2xs text-fg-muted @max-3xl:hidden">
				Sorted by {sort.key === "pnl" ? `PNL ${WINDOW_LABEL[window]}` : SORT_LABEL[sort.key]}. Values not in the
				snapshot show n/a and sort last. Degen 2/5: leaderboard trader, size, leverage and fills unknown.
			</p>
		</div>
	);
}

function Head({
	on,
	dir,
	onClick,
	className,
	children,
}: {
	on: boolean;
	dir: "desc" | "asc";
	onClick: () => void;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center justify-end gap-1 text-right transition-colors hover:text-fg",
				on && "text-fg",
				className,
			)}
		>
			{children}
			{on && <Caret dir={dir} />}
		</button>
	);
}

function Caret({ dir }: { dir: "desc" | "asc" }) {
	return dir === "desc" ? (
		<CaretDownIcon weight="bold" className="size-3" />
	) : (
		<CaretUpIcon weight="bold" className="size-3" />
	);
}

function Meter({ value, hint, className }: { value: number; hint?: string; className?: string }) {
	return (
		<span className={cn("flex flex-col items-end gap-1", className)}>
			<span className="flex items-baseline gap-1">
				{hint && <span className="text-2xs text-fg-muted">{hint}</span>}
				<span>{value}</span>
			</span>
			<span className="h-1 w-full overflow-hidden rounded-full bg-control-hover">
				<span className="block h-full rounded-full bg-fg-secondary" style={{ width: `${value}%` }} />
			</span>
		</span>
	);
}

function Check({ on, muted }: { on: boolean; muted?: boolean }) {
	return (
		<span
			className={cn(
				"grid size-4 place-items-center rounded-4",
				on && !muted && "bg-brand text-fg-inverse",
				on && muted && "bg-control-hover text-fg-muted",
				!on && "bg-control-hover",
			)}
		>
			{on && <CheckIcon weight="bold" className="size-3" />}
		</span>
	);
}

function Directory({ open, onOpenChange, pickedId, onPick }: DirectoryProps) {
	return (
		<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
			<header className="flex flex-col gap-1 p-4 pr-14">
				<SurfaceTitle>Trader directory</SurfaceTitle>
			</header>
			<Table
				multi={false}
				checked={new Set()}
				locked={new Set()}
				pickedId={pickedId}
				onRow={(t) => {
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
	const memberIds = new Set(members.map((m) => m.id));

	function toggle(id: string) {
		onChange(members.map((m) => (m.id === id ? { ...m, on: !m.on } : m)));
	}

	return (
		<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
			{view === "add" ? (
				<>
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
					<Table
						multi
						checked={adding}
						locked={memberIds}
						pickedId={null}
						onRow={(t) =>
							setAdding((s) => {
								const next = new Set(s);
								if (next.has(t.id)) next.delete(t.id);
								else next.add(t.id);
								return next;
							})
						}
					/>
					<div className="flex items-center justify-between gap-3 p-4 pt-2">
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
				</>
			) : (
				<>
					<header className="flex flex-col gap-1 p-4 pr-14">
						<SurfaceTitle>Edit basket</SurfaceTitle>
					</header>
					<div className="mx-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-12 bg-control p-3">
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
							<Button variant="filled" intent="neutral" size="sm" onClick={() => setView("add")}>
								<PlusIcon className="size-3.5" />
								Add traders
							</Button>
						</span>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">
						<div
							className={cn(
								COLS_MULTI,
								"sticky top-0 z-10 bg-overlay px-2 pb-2 text-2xs text-fg-muted @max-3xl:grid-cols-[16px_minmax(0,1fr)_72px_56px]",
							)}
						>
							<span />
							<span className="@max-3xl:hidden">#</span>
							<span>Trader</span>
							<span className="text-right">PNL 30d</span>
							<span className="text-right @max-3xl:hidden">Trades/day</span>
							<span className="text-right @max-3xl:hidden">Consistency</span>
							<span className="text-right">Degen</span>
							<span className="text-right @max-3xl:hidden">Side {MOOD_MARKET}</span>
						</div>
						{members.map((m, i) => {
							const t = byId.get(m.id) ?? pastedTrader(m.id);
							const side = hypeSide(t.id);
							return (
								<button
									key={m.id}
									type="button"
									onClick={() => toggle(m.id)}
									className={cn(
										COLS_MULTI,
										"w-full rounded-8 px-2 py-2 text-left text-xs tabular-nums transition-colors hover:bg-control",
										!m.on && "text-fg-disabled",
									)}
								>
									<Check on={m.on} />
									<span className="text-fg-muted @max-3xl:hidden">{i + 1}</span>
									<span className="flex min-w-0 items-center gap-2.5">
										<Identicon id={t.id} className={cn("size-7", !m.on && "opacity-40")} />
										<span className="flex min-w-0 flex-col">
											<span className="truncate font-medium">{t.name}</span>
											<span className="truncate text-2xs text-fg-muted">{memberNote(m.on, t.inPool)}</span>
										</span>
									</span>
									<span className={cn("text-right", m.on && pnlTone(t.pnl.d30))}>{usd(t.pnl.d30, true)}</span>
									<span className="text-right @max-3xl:hidden">{tradesText(t)}</span>
									<span className="text-right @max-3xl:hidden">{t.consistency}</span>
									<span className="text-right">{t.degen}</span>
									<span
										className={cn(
											"text-right @max-3xl:hidden",
											m.on && side === "Long" && "text-market-up",
											m.on && side === "Short" && "text-market-down",
											!side && "text-fg-muted",
										)}
									>
										{side ?? "None"}
									</span>
								</button>
							);
						})}
					</div>
				</>
			)}
		</Surface>
	);
}
