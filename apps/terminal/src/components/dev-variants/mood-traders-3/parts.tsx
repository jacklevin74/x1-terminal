import { CaretLeftIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { shortAddress } from "@/lib/mood/signal";
import { AutoTargetCard, HeroCard } from "../mood-traders/drawer";
import { countLabel, positionText, STANCES, scoreOf, stanceOf, type Trader, traderLabel } from "./data";

export function Top({ selected }: { selected: ReadonlySet<string> }) {
	const score = scoreOf(selected);
	return (
		<>
			<HeroCard score={score}>
				<span className="tabular-nums text-fg-muted">{countLabel(selected)}</span>
			</HeroCard>
			<AutoTargetCard score={score} />
		</>
	);
}

export function BackHeader({ title, onBack, aside }: { title: string; onBack: () => void; aside?: ReactNode }) {
	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={onBack}
				aria-label="Back to Mood Ring"
				className="grid size-8 flex-none place-items-center rounded-full bg-control transition-colors hover:bg-control-hover"
			>
				<CaretLeftIcon weight="bold" className="size-3.5" />
			</button>
			<span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
			{aside}
		</div>
	);
}

export function TraderLine({ t, on = true, className }: { t: Trader; on?: boolean; className?: string }) {
	const stance = STANCES.find((s) => s.id === stanceOf(t));
	return (
		<span className={cn("min-w-0 flex-1", !on && "text-fg-muted", className)}>
			<span className="block truncate text-xs">
				{traderLabel(t)} <span className="text-fg-muted">{shortAddress(t.usr)}</span>
			</span>
			<span className={cn("block text-2xs tabular-nums", on && t.pos ? stance?.text : "text-fg-muted")}>
				{positionText(t)}
			</span>
		</span>
	);
}
