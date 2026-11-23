import { PauseIcon, PlayIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { type HeaderProps, isOn, LABEL } from "./data";

function Icon({ phase }: { phase: HeaderProps["phase"] }) {
	if (phase === "stopped") return <WarningCircleIcon weight="fill" className="size-3.5" />;
	if (isOn(phase)) return <PlayIcon weight="fill" className="size-3" />;
	return <PauseIcon weight="fill" className="size-3" />;
}

export default function V2({ phase }: HeaderProps) {
	return (
		<button
			type="button"
			className={cn(
				"flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs transition-colors",
				isOn(phase) && "bg-control text-market-up hover:bg-control-hover",
				(phase === "paused" || phase === "closing") && "bg-control text-fg-secondary hover:bg-control-hover",
				phase === "stopped" && "bg-control text-market-down hover:bg-control-hover",
			)}
		>
			<Icon phase={phase} />
			<span>Auto</span>
			<span className="opacity-70">{LABEL[phase]}</span>
		</button>
	);
}
