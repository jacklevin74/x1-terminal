import { Button, Toggle } from "@hypeterminal/ui";
import {
	ArrowCounterClockwiseIcon,
	ArrowLeftIcon,
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
	DEFAULT_BASKET,
	type DirTrader,
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
	Surface,
	SurfaceTitle,
} from "./panel";

export default function V4(props: VariantProps & { edited?: boolean }) {
	return <AutoPanel {...props} Directory={Directory} BasketEditor={BasketEditor} />;
}

const WIDTH = "max-w-[820px]";

const FILTERS = {
	steady: { label: "Steady (degen under 35)", test: (t: DirTrader) => t.degen < 35 },
	degen: { label: "Hail mary (degen 60+)", test: (t: DirTrader) => t.degen >= 60 },
	consistent: { label: "Consistent (70+)", test: (t: DirTrader) => t.consistency >= 70 },
	active: { label: "50+ trades a day", test: (t: DirTrader) => (t.tradesDay ?? 0) >= 50 },
	long: { label: "Leaning long", test: (t: DirTrader) => (t.lean ?? 0) >= 20 },
	short: { label: "Leaning short", test: (t: DirTrader) => (t.lean ?? 0) <= -20 },
	green: { label: "In profit 30d", test: (t: DirTrader) => (t.pnl.d30 ?? 0) > 0 },
} as const;
type FilterKey = keyof typeof FILTERS;

interface ListProps {
	multi: boolean;
	checked: ReadonlySet<string>;
	locked: ReadonlySet<string>;
	pickedId: string | null;
	onRow: (t: DirTrader) => void;
}

function List({ multi, checked, locked, pickedId, onRow }: ListProps) {
	const [sort, setSort] = useState<SortKey>("pnl");
	const [window, setWindow] = useState<Window>("d30");
	const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
	const [text, setText] = useState("");
	const pasted = isAddress(text);
	const list = pasted
		? [pastedTrader(text)]
		: queryDirectory({ sort, window, text }).filter((t) => [...filters].every((f) => FILTERS[f].test(t)));

	function flip(f: FilterKey) {
		setFilters((s) => {
			const next = new Set(s);
			if (next.has(f)) next.delete(f);
			else next.add(f);
			return next;
		});
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			<div className="flex flex-col gap-2.5 px-4">
				<label className="flex h-9 items-center gap-2 rounded-8 bg-control px-3">
					<MagnifyingGlassIcon className="size-4 text-fg-muted" />
					<input
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Search a name or paste an address"
						className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
					/>
				</label>
				<div className="flex flex-wrap gap-1 @max-3xl:flex-nowrap @max-3xl:overflow-x-auto">
					{(Object.keys(FILTERS) as FilterKey[]).map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => flip(f)}
							className={cn(
								"inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs transition-colors",
								filters.has(f) ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary hover:bg-control-hover",
							)}
						>
							{filters.has(f) && <CheckIcon weight="bold" className="size-3" />}
							{FILTERS[f].label}
						</button>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
					<span className="text-fg-muted">Sort by</span>
					<span className="flex gap-3 @max-3xl:overflow-x-auto">
						{SORT_KEYS.map((k) => (
							<button
								key={k}
								type="button"
								onClick={() => setSort(k)}
								className={cn("shrink-0 transition-colors", sort === k ? "text-fg" : "text-fg-muted hover:text-fg")}
							>
								{SORT_LABEL[k]}
							</button>
						))}
					</span>
					<span className="ml-auto flex gap-1">
						{(Object.keys(WINDOW_LABEL) as Window[]).map((w) => (
							<button
								key={w}
								type="button"
								onClick={() => setWindow(w)}
								className={cn(
									"h-6 rounded-6 px-2 transition-colors",
									window === w ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
								)}
							>
								{WINDOW_LABEL[w]}
							</button>
						))}
					</span>
				</div>
				<span className="text-2xs text-fg-muted">{list.length} traders</span>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
				{list.map((t) => {
					const isLocked = locked.has(t.id);
					const on = checked.has(t.id) || isLocked || t.id === pickedId;
					return (
						<button
							key={t.id}
							type="button"
							disabled={isLocked}
							onClick={() => onRow(t)}
							className={cn(
								"flex w-full items-center gap-3 rounded-8 px-2 py-2.5 text-left transition-colors",
								on && !isLocked ? "bg-control" : "hover:bg-control",
							)}
						>
							<Identicon id={t.id} className={cn("size-8", isLocked && "opacity-40")} />
							<span className="flex min-w-0 flex-1 flex-col gap-1">
								<span className="flex items-center gap-2">
									<span className={cn("truncate text-xs font-medium", isLocked && "text-fg-muted")}>{t.name}</span>
									{isLocked && <span className="text-2xs text-fg-muted">In basket</span>}
								</span>
								<span className="flex flex-wrap gap-1">
									<Tag on={sort === "trades"}>{tradesText(t)} trades/day</Tag>
									<Tag on={sort === "consistency"}>Consistency {t.consistency}</Tag>
									<Tag on={sort === "degen"}>
										Degen {t.degen}
										{t.degenInputs < 5 ? "*" : ""}
									</Tag>
									<Tag on={false} className="@max-3xl:hidden">
										{t.followers} followers
									</Tag>
								</span>
							</span>
							<span className="flex shrink-0 flex-col items-end">
								<span className={cn("text-xs font-medium tabular-nums", pnlTone(t.pnl[window]))}>
									{usd(t.pnl[window], true)}
								</span>
								<span className="text-2xs text-fg-muted">{WINDOW_LABEL[window]}</span>
							</span>
							{multi && (
								<span
									className={cn(
										"grid size-5 shrink-0 place-items-center rounded-full",
										on && !isLocked && "bg-brand text-fg-inverse",
										isLocked && "bg-control-hover text-fg-muted",
										!on && "bg-control",
									)}
								>
									{on && <CheckIcon weight="bold" className="size-3" />}
								</span>
							)}
						</button>
					);
				})}
				{!list.length && <p className="py-10 text-center text-xs text-fg-muted">No traders match these filters.</p>}
				<p className="px-2 pt-3 text-2xs text-fg-muted">
					* Degen from 2 of 5 inputs (leaderboard trader). n/a = not in the snapshot.
				</p>
			</div>
		</div>
	);
}

function Tag({ on, className, children }: { on: boolean; className?: string; children: React.ReactNode }) {
	return (
		<span
			className={cn(
				"rounded-4 px-1.5 py-px text-2xs whitespace-nowrap tabular-nums",
				on ? "bg-control-hover text-fg" : "bg-control text-fg-muted",
				className,
			)}
		>
			{children}
		</span>
	);
}

function Directory({ open, onOpenChange, pickedId, onPick }: DirectoryProps) {
	return (
		<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
			<header className="p-4 pr-14">
				<SurfaceTitle>Find a trader to copy</SurfaceTitle>
			</header>
			<List
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

type Show = "all" | "on" | "off" | "added";

function showFilter(show: Show, m: Member) {
	if (show === "on") return m.on;
	if (show === "off") return !m.on;
	if (show === "added") return !DEFAULT_BASKET.includes(m.id);
	return true;
}

function BasketEditor({ open, onOpenChange, members, onChange, startInAdd }: BasketEditorProps) {
	const [view, setView] = useState<"list" | "add">(startInAdd ? "add" : "list");
	const [adding, setAdding] = useState<Set<string>>(new Set());
	const [show, setShow] = useState<Show>("all");
	const ids = onIds(members);
	const mood = basketMood(ids);
	const counts: Record<Show, number> = {
		all: members.length,
		on: ids.length,
		off: members.length - ids.length,
		added: members.filter((m) => !DEFAULT_BASKET.includes(m.id)).length,
	};

	function bulkOff(test: (t: DirTrader) => boolean, label: string) {
		const hit = members.filter((m) => m.on && test(byId.get(m.id) ?? pastedTrader(m.id)));
		if (!hit.length) return toast.success(`No ${label} traders are on.`);
		onChange(members.map((m) => (hit.includes(m) ? { ...m, on: false } : m)));
		toast.success(`Turned off ${hit.length} ${label} ${hit.length === 1 ? "trader" : "traders"}.`);
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
					<SurfaceTitle>Add traders</SurfaceTitle>
				</header>
				<List
					multi
					checked={adding}
					locked={new Set(members.map((m) => m.id))}
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
				<SurfaceTitle>Basket traders</SurfaceTitle>
			</header>
			<div className="flex flex-col gap-2.5 px-4">
				<div className="flex flex-wrap gap-1">
					{(["all", "on", "off", "added"] as const).map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => setShow(s)}
							className={cn(
								"h-7 rounded-full px-2.5 text-xs capitalize transition-colors",
								show === s ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary hover:bg-control-hover",
							)}
						>
							{s} {counts[s]}
						</button>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-1 text-xs">
					<span className="pr-1 text-fg-muted">Quick</span>
					<button
						type="button"
						onClick={() => bulkOff(FILTERS.degen.test, "hail mary")}
						className="h-7 rounded-full bg-control px-2.5 text-fg-secondary hover:bg-control-hover"
					>
						Turn off degen 60+
					</button>
					<button
						type="button"
						onClick={() => bulkOff((t) => (t.pnl.d30 ?? 0) < 0, "losing")}
						className="h-7 rounded-full bg-control px-2.5 text-fg-secondary hover:bg-control-hover"
					>
						Turn off losing 30d
					</button>
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
				{members
					.filter((m) => showFilter(show, m))
					.map((m) => {
						const t = byId.get(m.id) ?? pastedTrader(m.id);
						const side = hypeSide(t.id);
						return (
							<div key={m.id} className="flex items-center gap-3 rounded-8 px-2 py-2 hover:bg-control">
								<Identicon id={t.id} className={cn("size-7", !m.on && "opacity-40 grayscale")} />
								<span className="flex min-w-0 flex-1 flex-col">
									<span className={cn("truncate text-xs font-medium", !m.on && "text-fg-muted")}>{t.name}</span>
									<span className="flex flex-wrap gap-1 pt-0.5">
										<Tag on={false}>Degen {t.degen}</Tag>
										<Tag on={false}>{usd(t.pnl.d30, true)} 30d</Tag>
										{side && (
											<span
												className={cn(
													"rounded-4 bg-control px-1.5 py-px text-2xs whitespace-nowrap",
													side === "Long" ? "text-market-up" : "text-market-down",
												)}
											>
												{side} {MOOD_MARKET}
											</span>
										)}
									</span>
								</span>
								<span className={cn("text-2xs @max-3xl:hidden", m.on ? "text-fg-secondary" : "text-fg-muted")}>
									{m.on ? "Counted" : "Off"}
								</span>
								<Toggle
									checked={m.on}
									onCheckedChange={(on) => onChange(members.map((x) => (x.id === m.id ? { ...x, on } : x)))}
									aria-label={`Count ${t.name}`}
								/>
							</div>
						);
					})}
			</div>
			<div className="flex flex-wrap items-center gap-3 bg-control px-4 py-3">
				<span className="flex min-w-[160px] flex-1 flex-col gap-1.5">
					<span className="flex justify-between text-xs">
						<span className="text-fg-muted">
							{ids.length} counted, {MOOD_MARKET} mood
						</span>
						<span
							className={cn(
								"tabular-nums",
								mood.score >= 15 && "text-market-up",
								mood.score <= -15 && "text-market-down",
							)}
						>
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
				</span>
			</div>
		</Surface>
	);
}
