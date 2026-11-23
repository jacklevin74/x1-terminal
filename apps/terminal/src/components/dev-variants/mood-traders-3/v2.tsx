import { CaretDownIcon, CheckIcon, TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Frame } from "../mood-traders-2/frame";
import { countLabel, groupsOf, isAll, type Props, STANCES, type Stance, stanceOf, traderLabel, traders } from "./data";
import { Top, TraderLine } from "./parts";

const TILE: Record<Stance, string> = {
	bullish: "bg-success-soft",
	neutral: "bg-control",
	bearish: "bg-error-soft",
};

export default function V2({ selected, toggle, reset, scene }: Props) {
	const [open, setOpen] = useState(scene === "editing");
	const { groups } = groupsOf(selected);
	return (
		<Frame anchor={scene === "editing"}>
			<div className="space-y-3">
				<Top selected={selected} />
				<section data-anchor className="rounded-12 bg-surface p-3">
					<div className="grid grid-cols-3 gap-2">
						{STANCES.map((s) => (
							<div key={s.id} className={cn("flex flex-col gap-1 rounded-8 p-3", TILE[s.id])}>
								<span className={cn("text-lg font-medium tabular-nums", s.text)}>{groups[s.id].length}</span>
								<span className="flex items-center gap-1 text-xs text-fg-secondary">
									{s.id === "bullish" && <TrendUpIcon weight="bold" className="size-3" />}
									{s.id === "bearish" && <TrendDownIcon weight="bold" className="size-3" />}
									{s.label}
								</span>
							</div>
						))}
					</div>
					<button
						type="button"
						aria-expanded={open}
						onClick={() => setOpen((o) => !o)}
						className="mt-2 flex h-9 w-full items-center justify-between rounded-8 px-2 text-xs hover:bg-control"
					>
						<span className="tabular-nums">{countLabel(selected)} in your mood score</span>
						<span className="flex items-center gap-1 text-fg-muted">
							{open ? "Close" : "Choose traders"}
							<CaretDownIcon weight="bold" className={cn("size-3 transition-transform", open && "rotate-180")} />
						</span>
					</button>
					{open && (
						<div className="mood-fade-in mt-1 flex flex-col gap-3">
							{STANCES.map((s) => {
								const list = traders.filter((t) => stanceOf(t) === s.id);
								return (
									<div key={s.id}>
										<div className="flex items-baseline justify-between px-2 pb-1 text-2xs tracking-micro text-fg-muted uppercase">
											<span>{s.label}</span>
											<span className="tabular-nums">
												{groups[s.id].length} of {list.length}
											</span>
										</div>
										{list.map((t) => {
											const on = selected.has(t.usr);
											return (
												<button
													key={t.usr}
													type="button"
													aria-pressed={on}
													aria-label={traderLabel(t)}
													onClick={() => toggle(t.usr)}
													className="flex w-full items-center gap-3 rounded-8 px-2 py-1.5 text-left hover:bg-control"
												>
													<span
														className={cn(
															"grid size-4 flex-none place-items-center rounded-4",
															on ? "bg-fill text-fg-inverse" : "bg-control-hover",
														)}
													>
														{on && <CheckIcon weight="bold" className="size-3" />}
													</span>
													<TraderLine t={t} on={on} />
												</button>
											);
										})}
									</div>
								);
							})}
							{!isAll(selected) && (
								<button
									type="button"
									onClick={reset}
									className="mx-2 mb-1 h-8 rounded-8 bg-control text-xs hover:bg-control-hover"
								>
									Use all {traders.length} traders
								</button>
							)}
						</div>
					)}
				</section>
			</div>
		</Frame>
	);
}
