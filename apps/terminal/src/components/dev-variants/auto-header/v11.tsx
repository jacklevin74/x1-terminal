import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

export default function V11({ phase, onToggle }: HeaderProps) {
	const on = isOn(phase);
	return (
		<div className="flex h-7 shrink-0 items-stretch gap-px overflow-hidden rounded-8 text-xs">
			<button
				type="button"
				className="flex items-center gap-1.5 bg-control px-2.5 text-fg-secondary hover:bg-control-hover"
			>
				Auto
				<span className={cn(on ? "text-market-up" : "text-fg", phase === "stopped" && "text-market-down")}>
					{LABEL[phase]}
				</span>
			</button>
			<button
				type="button"
				onClick={onToggle}
				disabled={phase === "closing"}
				aria-label={on ? "Pause" : "Start"}
				className="flex w-7 items-center justify-center bg-control text-fg-secondary hover:bg-control-hover hover:text-fg disabled:opacity-40"
			>
				{on ? <PauseIcon weight="fill" className="size-3" /> : <PlayIcon weight="fill" className="size-3" />}
			</button>
		</div>
	);
}
