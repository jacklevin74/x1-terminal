import { Button } from "@hypeterminal/ui";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Frame } from "../mood-traders-2/frame";
import { byStance, countLabel, groupsOf, isAll, type Props, STANCES, traderLabel } from "./data";
import { BackHeader, Top, TraderLine } from "./parts";

export default function V1({ selected, toggle, reset, scene }: Props) {
	const [editing, setEditing] = useState(scene === "editing");
	const { groups, total } = groupsOf(selected);

	if (editing)
		return (
			<Frame
				header={<BackHeader title="Traders" onBack={() => setEditing(false)} />}
				footer={
					<div className="flex flex-none items-center gap-3 bg-surface px-4 py-3">
						<span className="flex-1 text-xs tabular-nums">{countLabel(selected)} count</span>
						<Button variant="secondary" intent="neutral" size="sm" disabled={isAll(selected)} onClick={reset}>
							Reset
						</Button>
						<Button variant="filled" intent="neutral" size="sm" onClick={() => setEditing(false)}>
							Done
						</Button>
					</div>
				}
			>
				<div className="mood-fade-in rounded-12 bg-surface p-2">
					{byStance.map((t) => {
						const on = selected.has(t.usr);
						return (
							<button
								key={t.usr}
								type="button"
								role="switch"
								aria-checked={on}
								aria-label={traderLabel(t)}
								onClick={() => toggle(t.usr)}
								className="flex w-full items-center gap-3 rounded-8 px-2 py-2 text-left hover:bg-control"
							>
								<TraderLine t={t} on={on} />
								<span
									className={cn(
										"flex h-5 w-9 flex-none items-center rounded-full p-0.5 transition-colors",
										on ? "bg-fill" : "bg-control-hover",
									)}
								>
									<span
										className={cn(
											"size-4 rounded-full transition-transform",
											on ? "translate-x-4 bg-background" : "bg-fg-muted",
										)}
									/>
								</span>
							</button>
						);
					})}
				</div>
			</Frame>
		);

	return (
		<Frame>
			<div className="space-y-3">
				<Top selected={selected} />
				<section className="rounded-12 bg-surface p-4">
					<div className="flex items-center justify-between gap-3">
						<span className="text-xs font-medium tabular-nums">{countLabel(selected)}</span>
						<Button variant="secondary" intent="neutral" size="xs" onClick={() => setEditing(true)}>
							<PencilSimpleIcon className="size-3" />
							Edit
						</Button>
					</div>
					<div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
						{STANCES.map((s) => (
							<span
								key={s.id}
								className={cn("h-full transition-[flex-grow] duration-300", s.fill)}
								style={{ flexGrow: groups[s.id].length, flexBasis: 0, opacity: s.id === "neutral" ? 0.4 : 1 }}
							/>
						))}
					</div>
					<div className="mt-3 grid grid-cols-3 text-xs">
						{STANCES.map((s, i) => (
							<span key={s.id} className={cn("flex flex-col", i === 1 && "items-center", i === 2 && "items-end")}>
								<span className={cn("text-base font-medium tabular-nums", s.text)}>{groups[s.id].length}</span>
								<span className="text-fg-muted">{s.label}</span>
							</span>
						))}
					</div>
					<span className="sr-only">{total} traders count</span>
				</section>
			</div>
		</Frame>
	);
}
