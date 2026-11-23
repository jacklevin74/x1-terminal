import { Button } from "@hypeterminal/ui";
import {
	CaretRightIcon,
	MagnifyingGlassIcon,
	MinusIcon,
	PlusIcon,
	TrendDownIcon,
	TrendUpIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Frame } from "../mood-traders-2/frame";
import { byStance, groupsOf, isAll, type Props, STANCES, type Stance, traderLabel, traders } from "./data";
import { Top, TraderLine } from "./parts";

const ICON: Record<Stance, typeof TrendUpIcon> = { bullish: TrendUpIcon, neutral: MinusIcon, bearish: TrendDownIcon };

export default function V3({ selected, toggle, reset, scene }: Props) {
	const [open, setOpen] = useState(scene === "editing");
	const [query, setQuery] = useState("");
	const { groups } = groupsOf(selected);
	const q = query.trim().toLowerCase();
	const list = byStance.filter((t) => !q || traderLabel(t).toLowerCase().includes(q) || t.usr.includes(q));

	const sheet = (
		<div className="absolute inset-0 z-10 flex flex-col justify-end">
			<button type="button" aria-label="Close" className="absolute inset-0 bg-scrim" onClick={() => setOpen(false)} />
			<div className="mood-fade-in relative flex max-h-[78%] origin-bottom flex-col rounded-t-16 bg-overlay shadow-menu">
				<div className="flex flex-none items-center justify-between gap-3 px-4 pt-4 pb-3">
					<span className="text-sm font-medium">Traders in your mood score</span>
					<span className="text-xs text-fg-muted tabular-nums">
						{selected.size} of {traders.length}
					</span>
				</div>
				<label className="mx-4 flex h-9 flex-none items-center gap-2 rounded-8 bg-control px-3 text-xs">
					<MagnifyingGlassIcon className="size-3.5 text-fg-muted" />
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search name or address"
						className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg-muted"
					/>
				</label>
				<div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
					{list.map((t) => {
						const on = selected.has(t.usr);
						return (
							<div key={t.usr} className="flex items-center gap-3 rounded-8 px-2 py-1.5">
								<TraderLine t={t} on={on} />
								<Button
									variant="secondary"
									intent="neutral"
									size="xs"
									className="w-20"
									onClick={() => toggle(t.usr)}
									aria-label={`${on ? "Remove" : "Add"} ${traderLabel(t)}`}
								>
									{on ? <MinusIcon className="size-3" /> : <PlusIcon className="size-3" />}
									{on ? "Remove" : "Add"}
								</Button>
							</div>
						);
					})}
					{list.length === 0 && <p className="px-2 py-6 text-center text-xs text-fg-muted">No trader matches.</p>}
				</div>
				<div className="flex flex-none gap-2 p-4 pt-2">
					<Button
						variant="secondary"
						intent="neutral"
						size="md"
						className="flex-1"
						disabled={isAll(selected)}
						onClick={reset}
					>
						Reset to all {traders.length}
					</Button>
					<Button variant="filled" intent="neutral" size="md" className="flex-1" onClick={() => setOpen(false)}>
						Done
					</Button>
				</div>
			</div>
		</div>
	);

	return (
		<Frame footer={open ? sheet : undefined}>
			<div className="space-y-3">
				<Top selected={selected} />
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="flex w-full items-center gap-3 rounded-12 bg-surface py-3 pr-3 pl-4 text-left transition-colors hover:bg-control"
				>
					<span className="flex items-baseline gap-1.5">
						<span className="text-lg font-medium tabular-nums">{selected.size}</span>
						<span className="text-xs text-fg-muted">
							{isAll(selected) ? "traders" : `of ${traders.length} traders`}
						</span>
					</span>
					<span className="ml-auto flex items-center gap-3 text-xs tabular-nums">
						{STANCES.map((s) => {
							const Icon = ICON[s.id];
							return (
								<span key={s.id} className={cn("flex items-center gap-1", s.text)} title={s.label}>
									<Icon weight="bold" className="size-3.5" />
									{groups[s.id].length}
									<span className="sr-only">{s.label}</span>
								</span>
							);
						})}
					</span>
					<CaretRightIcon weight="bold" className="size-3.5 text-fg-muted" />
				</button>
			</div>
		</Frame>
	);
}
