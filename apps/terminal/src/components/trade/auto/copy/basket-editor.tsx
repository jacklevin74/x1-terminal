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
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import type { BasketMember } from "@/lib/auto-trader/types";
import { cn } from "@/lib/cn";
import { activePreset, defaultMembers, isDefault, onIds, PRESETS, presetMembers } from "./basket";
import {
	basketMood,
	byId,
	type DirTrader,
	hypeSide,
	isAddress,
	MOOD_MARKET,
	memberNote,
	moodLabel,
	pastedTrader,
	pnlTone,
	queryDirectory,
	type SortKey,
	tradesText,
	usd,
} from "./data";
import { Identicon } from "./identicon";
import { MoodBar } from "./mood-line";
import { Pill } from "./pill";
import { Surface, SurfaceTitle } from "./surface";
import { TraderDetail } from "./trader-detail";
import { TwoPane } from "./two-pane";

const EDITOR_WIDTH = "max-w-[1180px]";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	members: BasketMember[];
	onChange: (next: BasketMember[]) => void;
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

export function BasketEditor({ open, onOpenChange, members, onChange }: Props) {
	const [view, setView] = useState<"list" | "add">("list");
	const [focusId, setFocusId] = useState<string | null>(null);
	const [pushed, setPushed] = useState(false);

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
						<TraderDetail
							key={focusRow.t.id}
							t={focusRow.t}
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
	members: BasketMember[];
	onChange: (next: BasketMember[]) => void;
	onBack: () => void;
	focusId: string | null;
	pushed: boolean;
	onOpen: (id: string) => void;
	onBackFromDetail: () => void;
}

function AddTraders({ members, onChange, onBack, focusId, pushed, onOpen, onBackFromDetail }: AddTradersProps) {
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
						<TraderDetail
							key={focusRow.t.id}
							t={focusRow.t}
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
