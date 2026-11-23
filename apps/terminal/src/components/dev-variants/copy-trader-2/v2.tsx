import { Button } from "@hypeterminal/ui";
import {
	ArrowCounterClockwiseIcon,
	ArrowLeftIcon,
	CheckIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
	basketMood,
	byId,
	count,
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

export default function V2(props: VariantProps & { edited?: boolean }) {
	return <AutoPanel {...props} Directory={Directory} BasketEditor={BasketEditor} />;
}

const WIDTH = "max-w-[1000px]";

interface GridProps {
	multi: boolean;
	checked: ReadonlySet<string>;
	locked: ReadonlySet<string>;
	pickedId: string | null;
	onCard: (t: DirTrader) => void;
}

function Grid({ multi, checked, locked, pickedId, onCard }: GridProps) {
	const [sort, setSort] = useState<SortKey>("pnl");
	const [window, setWindow] = useState<Window>("d30");
	const [text, setText] = useState("");
	const pasted = isAddress(text);
	const list = pasted ? [pastedTrader(text)] : queryDirectory({ sort, window, text });

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			<div className="flex flex-col gap-2 px-4">
				<label className="flex h-9 items-center gap-2 rounded-8 bg-control px-3">
					<MagnifyingGlassIcon className="size-4 text-fg-muted" />
					<input
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Search a name or paste an address"
						className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
					/>
				</label>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex gap-1 overflow-x-auto">
						{SORT_KEYS.map((k) => (
							<button
								key={k}
								type="button"
								onClick={() => setSort(k)}
								className={cn(
									"h-8 shrink-0 rounded-full px-3 text-xs transition-colors",
									sort === k ? "bg-fill text-fg-inverse" : "bg-control text-fg-secondary hover:bg-control-hover",
								)}
							>
								{SORT_LABEL[k]}
							</button>
						))}
					</div>
					<div className="flex items-center gap-0.5 rounded-full bg-control p-1">
						{(Object.keys(WINDOW_LABEL) as Window[]).map((w) => (
							<button
								key={w}
								type="button"
								onClick={() => setWindow(w)}
								className={cn(
									"h-6 rounded-full px-2.5 text-xs transition-colors",
									window === w ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg",
								)}
							>
								{WINDOW_LABEL[w]}
							</button>
						))}
					</div>
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
				<div className="grid grid-cols-3 gap-2 @max-3xl:grid-cols-1">
					{list.map((t) => {
						const isLocked = locked.has(t.id);
						const on = checked.has(t.id) || t.id === pickedId;
						return (
							<button
								key={t.id}
								type="button"
								disabled={isLocked}
								onClick={() => onCard(t)}
								className={cn(
									"flex flex-col gap-3 rounded-12 p-3 text-left transition-colors @max-3xl:gap-2",
									on ? "bg-control-hover" : "bg-control hover:bg-control-hover",
									isLocked && "opacity-50",
								)}
							>
								<span className="flex items-center gap-2.5">
									<Identicon id={t.id} className="size-9" />
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="truncate text-xs font-medium">{t.name}</span>
										<span className="truncate text-2xs text-fg-muted">
											{isLocked ? "In basket" : (t.style ?? `${usd(t.equity)} equity`)}
										</span>
									</span>
									{(multi || on) && (
										<span
											className={cn(
												"grid size-5 shrink-0 place-items-center rounded-full",
												on || isLocked ? "bg-brand text-fg-inverse" : "bg-surface",
											)}
										>
											{(on || isLocked) && <CheckIcon weight="bold" className="size-3" />}
										</span>
									)}
								</span>
								<span className="flex items-baseline justify-between gap-2">
									<span className={cn("text-base font-medium tabular-nums", pnlTone(t.pnl[window]))}>
										{usd(t.pnl[window], true)}
									</span>
									<span className="text-2xs text-fg-muted">PNL {WINDOW_LABEL[window]}</span>
								</span>
								<span className="grid grid-cols-3 gap-1 text-xs tabular-nums">
									<Cell label="Trades/day" value={tradesText(t)} on={sort === "trades"} />
									<Cell label="Consistency" value={String(t.consistency)} on={sort === "consistency"} />
									<Cell label="Degen" value={String(t.degen)} on={sort === "degen"} />
								</span>
								<span className="flex items-center gap-2">
									<DegenGauge value={t.degen} />
									<span className="shrink-0 text-2xs text-fg-muted">
										{degenLabel(t.degen)}
										{t.degenInputs < 5 ? ` (${t.degenInputs}/5 inputs)` : ""}
									</span>
								</span>
								<span className="flex items-center gap-1 text-2xs text-fg-muted @max-3xl:hidden">
									<UsersIcon className="size-3" />
									{count(t.followers)} followers
								</span>
							</button>
						);
					})}
				</div>
				{pasted && !byId.has(list[0]?.id ?? "") && (
					<p className="pt-3 text-2xs text-fg-muted">
						Not in the snapshot. The bot can still copy it; stats load after you pick it.
					</p>
				)}
				{!list.length && <p className="py-10 text-center text-xs text-fg-muted">No traders match.</p>}
			</div>
		</div>
	);
}

function Cell({ label, value, on }: { label: string; value: string; on: boolean }) {
	return (
		<span className={cn("flex flex-col gap-0.5 rounded-8 px-2 py-1.5", on ? "bg-surface" : "bg-control-hover")}>
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn(value === "n/a" && "text-fg-muted")}>{value}</span>
		</span>
	);
}

function DegenGauge({ value }: { value: number }) {
	return (
		<span className="grid flex-1 grid-cols-10 gap-0.5">
			{Array.from({ length: 10 }, (_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed 10 segment gauge
					key={i}
					className={cn("h-1.5 rounded-full", i < Math.round(value / 10) ? "bg-fg-secondary" : "bg-surface")}
				/>
			))}
		</span>
	);
}

function Directory({ open, onOpenChange, pickedId, onPick }: DirectoryProps) {
	return (
		<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
			<header className="flex flex-col gap-1 p-4 pr-14">
				<SurfaceTitle>Choose a trader</SurfaceTitle>
				<span className="text-xs text-fg-muted">
					87 traders. Degen is high for a few big bets, low for many small ones.
				</span>
			</header>
			<Grid
				multi={false}
				checked={new Set()}
				locked={new Set()}
				pickedId={pickedId}
				onCard={(t) => {
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
				<Grid
					multi
					checked={adding}
					locked={new Set(members.map((m) => m.id))}
					pickedId={null}
					onCard={(t) =>
						setAdding((s) => {
							const next = new Set(s);
							if (next.has(t.id)) next.delete(t.id);
							else next.add(t.id);
							return next;
						})
					}
				/>
				<div className="flex items-center justify-between gap-3 bg-control p-3 px-4">
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
			<header className="flex flex-col gap-1 p-4 pr-14">
				<SurfaceTitle>Your basket</SurfaceTitle>
				<span className="text-xs text-fg-muted">Tap a trader to turn them off or on.</span>
			</header>
			<div className="mx-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-12 bg-control p-4 @max-3xl:grid-cols-[auto_1fr]">
				<span className="flex flex-col">
					<span
						className={cn(
							"text-lg font-medium tabular-nums",
							mood.score >= 15 && "text-market-up",
							mood.score <= -15 && "text-market-down",
						)}
					>
						{mood.score > 0 ? "+" : ""}
						{mood.score}
					</span>
					<span className="text-2xs text-fg-muted">
						{MOOD_MARKET} {moodLabel(mood.score).toLowerCase()}
					</span>
				</span>
				<span className="flex flex-col gap-1.5">
					<MoodBar score={mood.score} />
					<span className="text-2xs text-fg-muted">
						{ids.length} of {members.length} on. {mood.longCount} long, {mood.shortCount} short on {MOOD_MARKET}.
					</span>
				</span>
				<span className="flex gap-2 @max-3xl:col-span-2">
					<Button
						variant="filled"
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
				</span>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				<div className="grid grid-cols-5 gap-2 @max-3xl:grid-cols-2">
					<button
						type="button"
						onClick={() => setView("add")}
						className="flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-12 bg-control text-xs text-fg-secondary transition-colors hover:bg-control-hover hover:text-fg"
					>
						<PlusIcon className="size-5" />
						Add traders
					</button>
					{members.map((m) => {
						const t = byId.get(m.id) ?? pastedTrader(m.id);
						const side = hypeSide(t.id);
						return (
							<button
								key={m.id}
								type="button"
								onClick={() => onChange(members.map((x) => (x.id === m.id ? { ...x, on: !x.on } : x)))}
								className={cn(
									"relative flex min-h-[92px] flex-col gap-2 rounded-12 p-3 text-left transition-colors",
									m.on ? "bg-control-hover" : "bg-surface hover:bg-control",
								)}
							>
								<span className="flex items-center justify-between">
									<Identicon id={t.id} className={cn("size-7", !m.on && "grayscale opacity-40")} />
									<span
										className={cn(
											"grid size-5 place-items-center rounded-full",
											m.on ? "bg-brand text-fg-inverse" : "bg-control",
										)}
									>
										{m.on && <CheckIcon weight="bold" className="size-3" />}
									</span>
								</span>
								<span className="flex min-w-0 flex-col">
									<span className={cn("truncate text-xs font-medium", !m.on && "text-fg-muted line-through")}>
										{t.name}
									</span>
									<span className="flex items-center gap-1 text-2xs text-fg-muted">
										{!m.on && "Off"}
										{m.on && !t.inPool && "Added"}
										{m.on && t.inPool && side && (
											<span className={side === "Long" ? "text-market-up" : "text-market-down"}>
												{side} {MOOD_MARKET}
											</span>
										)}
										{m.on && t.inPool && !side && `No ${MOOD_MARKET}`}
									</span>
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</Surface>
	);
}
