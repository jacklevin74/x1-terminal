import { Button } from "@hypeterminal/ui";
import { ArrowCounterClockwiseIcon, ArrowRightIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { moodColor, shortAddress, signedScore } from "@/lib/mood/signal";
import { AutoTargetCard, HeroCard } from "../mood-traders/drawer";
import {
	ALL,
	type BasketProps,
	isAll,
	isLong,
	positionText,
	scoreOf,
	signedDelta,
	type Trader,
	traderLabel,
	traders,
	useFlash,
} from "./data";
import { Frame } from "./frame";

export default function V5({ selected, last, toggle, undo, reset, replace, changes, edited }: BasketProps) {
	const [applied, setApplied] = useState<ReadonlySet<string>>(() => new Set(ALL));
	const [editing, setEditing] = useState(edited);
	const flash = useFlash<HTMLSpanElement>(last?.id);

	const appliedScore = scoreOf(applied);
	const draftScore = scoreOf(selected);
	const pending = traders.filter((t) => applied.has(t.usr) !== selected.has(t.usr)).length;
	const out = traders.filter((t) => !selected.has(t.usr));
	const delta = last ? last.after - last.before : 0;

	function apply() {
		setApplied(new Set(selected));
		setEditing(false);
		toast.success(`Basket saved. ${selected.size} of ${ALL.length} traders count toward your HYPE mood.`);
	}
	function discard() {
		replace(new Set(applied));
		setEditing(false);
	}

	if (!editing) {
		const appliedOut = traders.filter((t) => !applied.has(t.usr));
		return (
			<Frame>
				<div className="mood-fade-in space-y-3">
					<HeroCard score={appliedScore}>
						{isAll(applied) ? undefined : (
							<span className="text-fg-muted tabular-nums">Your {applied.size} traders</span>
						)}
					</HeroCard>
					<section className="rounded-12 bg-surface p-4">
						<div className="flex items-center gap-3">
							<div className="min-w-0 flex-1">
								<div className="text-xs font-medium">
									{isAll(applied) ? "All 37 traders count" : `${applied.size} of ${ALL.length} traders count`}
								</div>
								<div className="mt-0.5 text-2xs text-fg-muted">
									{isAll(applied) ? "Default basket" : `${appliedOut.length} excluded by you`}
								</div>
							</div>
							<Button variant="secondary" intent="neutral" size="sm" onClick={() => setEditing(true)}>
								<PencilSimpleIcon className="size-3.5" />
								Edit basket
							</Button>
						</div>
						{appliedOut.length > 0 && (
							<div className="mt-3 flex flex-wrap gap-1.5">
								{appliedOut.map((t) => (
									<span
										key={t.usr}
										className="rounded-full bg-background px-2 py-0.5 text-2xs text-fg-muted line-through"
									>
										{traderLabel(t)}
									</span>
								))}
							</div>
						)}
					</section>
					<AutoTargetCard score={appliedScore} />
				</div>
			</Frame>
		);
	}

	return (
		<Frame
			header={
				<div className="mood-fade-in">
					<div className="text-sm font-medium">Edit basket</div>
					<div className="text-2xs text-fg-muted tabular-nums">
						{selected.size} in, {out.length} out
					</div>
				</div>
			}
			footer={
				<div className="flex flex-none flex-col gap-3 bg-surface px-4 pt-3 pb-4">
					<div className="flex items-center gap-3 text-xs">
						<span className="text-fg-muted">HYPE score</span>
						<span className="flex flex-1 items-center gap-1.5 tabular-nums">
							<span className="text-fg-muted">Now</span>
							<span style={{ color: moodColor(appliedScore) }}>{signedScore(appliedScore)}</span>
							<ArrowRightIcon className="size-3 text-fg-muted" />
							<span className="text-fg-muted">After</span>
							<span className="text-sm font-semibold" style={{ color: moodColor(draftScore) }}>
								{signedScore(draftScore)}
							</span>
							<span
								ref={flash}
								className="rounded-full bg-control px-1.5 py-px text-2xs font-medium opacity-0"
								style={{ color: delta === 0 ? undefined : moodColor(delta * 5) }}
							>
								{signedDelta(delta)}
							</span>
						</span>
						<Button variant="ghost" intent="neutral" size="xs" disabled={!changes.length} onClick={undo}>
							<ArrowCounterClockwiseIcon className="size-3.5" />
							Undo
						</Button>
					</div>
					<div className="grid grid-cols-[auto_1fr_1fr] gap-2">
						<Button variant="ghost" intent="neutral" size="md" disabled={isAll(selected)} onClick={reset}>
							Reset to all 37
						</Button>
						<Button variant="secondary" intent="neutral" size="md" onClick={discard}>
							Discard
						</Button>
						<Button variant="filled" intent="brand" size="md" disabled={pending === 0} onClick={apply}>
							{pending === 0 ? "No changes" : `Apply ${pending} ${pending === 1 ? "change" : "changes"}`}
						</Button>
					</div>
				</div>
			}
		>
			<div className="mood-fade-in space-y-3">
				<section className="rounded-12 bg-background p-3">
					<div className="mb-2 flex items-baseline justify-between text-xs">
						<span className="font-medium text-fg-secondary">Out of your basket</span>
						<span className="text-fg-muted tabular-nums">{out.length}</span>
					</div>
					{out.length === 0 ? (
						<p className="text-xs text-fg-muted">No one yet. Set a trader to Out and they show here.</p>
					) : (
						<div className="flex flex-wrap gap-1.5">
							{out.map((t) => (
								<button
									key={t.usr}
									type="button"
									onClick={() => toggle(t.usr)}
									className={cn(
										"inline-flex h-7 items-center gap-1 rounded-full bg-control pr-2.5 pl-2 text-xs text-fg-secondary transition-colors hover:bg-control-hover hover:text-fg",
										last?.usr === t.usr && "mood-fade-in",
									)}
								>
									<PlusIcon className="size-3" />
									{traderLabel(t)}
								</button>
							))}
						</div>
					)}
				</section>
				<section className="rounded-12 bg-surface p-2">
					{traders.map((t) => (
						<Row
							key={t.usr}
							t={t}
							on={selected.has(t.usr)}
							changed={applied.has(t.usr) !== selected.has(t.usr)}
							onToggle={toggle}
						/>
					))}
				</section>
			</div>
		</Frame>
	);
}

function Row({
	t,
	on,
	changed,
	onToggle,
}: {
	t: Trader;
	on: boolean;
	changed: boolean;
	onToggle: (usr: string) => void;
}) {
	return (
		<div className={cn("flex items-center gap-3 rounded-8 px-2 py-1.5", !on && "bg-background")}>
			<span className={cn("min-w-0 flex-1", !on && "text-fg-muted")}>
				<span className="flex items-center gap-1.5 truncate text-xs">
					{traderLabel(t)}
					{changed && <span className="rounded-full bg-control px-1.5 text-2xs text-fg-secondary">Edited</span>}
				</span>
				<span className="block text-2xs tabular-nums">
					<span className="text-fg-muted">{shortAddress(t.usr)}</span>{" "}
					<span
						className={cn(
							!on || !t.pos ? "text-fg-muted" : "",
							on && t.pos && (isLong(t) ? "text-market-up" : "text-market-down"),
						)}
					>
						{positionText(t)}
					</span>
				</span>
			</span>
			<div className="flex rounded-full bg-control p-0.5 text-xs">
				{(["In", "Out"] as const).map((label) => {
					const active = label === "In" ? on : !on;
					return (
						<button
							key={label}
							type="button"
							aria-pressed={active}
							onClick={() => !active && onToggle(t.usr)}
							className={cn(
								"h-6 w-10 rounded-full transition-colors",
								active && label === "In" && "bg-fill font-medium text-fg-inverse",
								active && label === "Out" && "bg-control-hover font-medium text-fg",
								!active && "text-fg-muted hover:text-fg",
							)}
						>
							{label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
