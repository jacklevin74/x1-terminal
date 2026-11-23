import { useState } from "react";
import { cn } from "@/lib/cn";
import { Frame } from "../mood-traders-2/frame";
import { countLabel, groupsOf, isAll, type Props, STANCES, type Stance, stanceOf, traderLabel, traders } from "./data";
import { Top, TraderLine } from "./parts";

export default function V4({ selected, toggle, reset, scene }: Props) {
	const [editing, setEditing] = useState(scene === "editing");
	const [tab, setTab] = useState<Stance>("bullish");
	const { groups } = groupsOf(selected);
	const rows = traders.filter((t) => stanceOf(t) === tab);

	return (
		<Frame anchor={scene === "editing"}>
			<div className="space-y-3">
				<Top selected={selected} />
				<section data-anchor className="rounded-12 bg-surface p-4">
					<div className="flex items-baseline justify-between gap-3 text-xs">
						<span className="font-medium tabular-nums">{countLabel(selected)}</span>
						<button
							type="button"
							onClick={() => setEditing((e) => !e)}
							className="text-fg-muted transition-colors hover:text-fg"
						>
							{editing ? "Done" : "Edit traders"}
						</button>
					</div>
					<div className="mt-4 flex gap-4">
						{STANCES.map((s) => {
							const all = traders.filter((t) => stanceOf(t) === s.id);
							return (
								<button
									key={s.id}
									type="button"
									disabled={!editing}
									aria-pressed={editing && tab === s.id}
									onClick={() => setTab(s.id)}
									className={cn(
										"-m-2 flex flex-col gap-2 rounded-8 p-2 text-left transition-colors",
										editing && "hover:bg-control",
										editing && tab === s.id && "bg-control",
									)}
									style={{ flexGrow: all.length, flexBasis: 0 }}
								>
									<span className="flex flex-wrap gap-1">
										{all.map((t) => (
											<span
												key={t.usr}
												className={cn(
													"size-2.5 rounded-full transition-colors",
													selected.has(t.usr) ? s.fill : "bg-control-hover",
												)}
											/>
										))}
									</span>
									<span className="text-xs">
										<span className={cn("font-medium tabular-nums", s.text)}>{groups[s.id].length}</span>{" "}
										<span className="text-fg-muted">{s.label.toLowerCase()}</span>
									</span>
								</button>
							);
						})}
					</div>
					{editing && (
						<div className="mood-fade-in mt-4 flex flex-col">
							{rows.map((t) => {
								const on = selected.has(t.usr);
								return (
									<div key={t.usr} className="flex items-center gap-3 py-1.5">
										<TraderLine t={t} on={on} />
										<span className="flex h-7 flex-none rounded-full bg-control p-0.5 text-xs">
											{[true, false].map((value) => (
												<button
													key={String(value)}
													type="button"
													aria-pressed={on === value}
													aria-label={`${value ? "Count" : "Leave out"} ${traderLabel(t)}`}
													onClick={() => on !== value && toggle(t.usr)}
													className={cn(
														"w-10 rounded-full transition-colors",
														on === value ? "bg-control-hover font-medium text-fg" : "text-fg-muted hover:text-fg",
													)}
												>
													{value ? "In" : "Out"}
												</button>
											))}
										</span>
									</div>
								);
							})}
							{!isAll(selected) && (
								<button
									type="button"
									onClick={reset}
									className="mt-2 self-start text-xs text-fg-muted transition-colors hover:text-fg"
								>
									Reset to all {traders.length}
								</button>
							)}
						</div>
					)}
				</section>
			</div>
		</Frame>
	);
}
