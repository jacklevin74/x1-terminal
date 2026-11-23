import { Button } from "@hypeterminal/ui";
import { CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { compactUsd, moodColor, signedScore } from "@/lib/mood/signal";
import { Frame } from "../mood-traders-2/frame";
import { ALL, byStance, countLabel, groupsOf, type Props, STANCES, scoreOf, traderLabel, traders } from "./data";
import { BackHeader, Top, TraderLine } from "./parts";

const NOTE = { bullish: "long", bearish: "short", neutral: "No HYPE position" } as const;

export default function V5({ selected, replace, scene }: Props) {
	const [draft, setDraft] = useState<Set<string> | null>(scene === "editing" ? new Set(selected) : null);
	const { groups, notional } = groupsOf(selected);

	if (draft) {
		const changes = traders.filter((t) => draft.has(t.usr) !== selected.has(t.usr)).length;
		const before = scoreOf(selected);
		const after = scoreOf(draft);
		function flip(usr: string) {
			const next = new Set(draft);
			if (next.has(usr)) next.delete(usr);
			else next.add(usr);
			setDraft(next);
		}
		return (
			<Frame
				header={
					<BackHeader
						title="Choose traders"
						onBack={() => setDraft(null)}
						aside={
							<button
								type="button"
								onClick={() => setDraft(new Set(ALL))}
								disabled={draft.size === traders.length}
								className="mr-1 text-xs text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
							>
								Select all
							</button>
						}
					/>
				}
				footer={
					<div className="flex flex-none items-center gap-3 bg-surface px-4 py-3">
						<span className="flex flex-1 flex-col text-xs tabular-nums">
							<span>{countLabel(draft)}</span>
							<span className="text-2xs text-fg-muted">
								HYPE score <span style={{ color: moodColor(before) }}>{signedScore(before)}</span> to{" "}
								<span style={{ color: moodColor(after) }}>{signedScore(after)}</span>
							</span>
						</span>
						<Button
							variant="filled"
							intent="neutral"
							size="sm"
							disabled={changes === 0 || draft.size === 0}
							onClick={() => {
								replace(draft);
								setDraft(null);
							}}
						>
							{changes === 0 ? "No changes" : `Apply ${changes} ${changes === 1 ? "change" : "changes"}`}
						</Button>
					</div>
				}
			>
				<div className="mood-fade-in grid grid-cols-2 gap-2">
					{byStance.map((t) => {
						const on = draft.has(t.usr);
						return (
							<button
								key={t.usr}
								type="button"
								aria-pressed={on}
								aria-label={traderLabel(t)}
								onClick={() => flip(t.usr)}
								className={cn(
									"flex items-start gap-2 rounded-8 p-2.5 text-left transition-colors",
									on ? "bg-control hover:bg-control-hover" : "bg-surface hover:bg-control",
								)}
							>
								<TraderLine t={t} on={on} />
								<span
									className={cn(
										"mt-0.5 grid size-4 flex-none place-items-center rounded-full",
										on ? "bg-fill text-fg-inverse" : "bg-control-hover",
									)}
								>
									{on && <CheckIcon weight="bold" className="size-2.5" />}
								</span>
							</button>
						);
					})}
				</div>
			</Frame>
		);
	}

	return (
		<Frame>
			<div className="space-y-3">
				<Top selected={selected} />
				<section className="rounded-12 bg-surface p-2">
					<div className="flex items-center justify-between gap-3 py-1 pr-1 pl-2">
						<span className="text-2xs tracking-micro text-fg-muted uppercase tabular-nums">{countLabel(selected)}</span>
						<Button variant="secondary" intent="neutral" size="xs" onClick={() => setDraft(new Set(selected))}>
							Customize
						</Button>
					</div>
					{STANCES.map((s) => (
						<div key={s.id} className="flex h-9 items-center gap-3 px-2 text-xs">
							<span className={cn("size-2 rounded-full", s.fill)} />
							<span className="w-16">{s.label}</span>
							<span className="w-6 text-right font-medium tabular-nums">{groups[s.id].length}</span>
							<span className="ml-auto text-fg-muted tabular-nums">
								{s.id === "neutral" ? NOTE.neutral : `${compactUsd(notional[s.id])} ${NOTE[s.id]}`}
							</span>
						</div>
					))}
				</section>
			</div>
		</Frame>
	);
}
