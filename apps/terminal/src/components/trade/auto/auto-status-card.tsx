import { CaretRightIcon, PauseIcon, PlayIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { AutoIconStack } from "./auto-icon-stack";

interface Props {
	on: boolean;
	title: string;
	subtitle: string;
	equity: string;
	markets?: string[];
	actionLabel?: string;
	busy?: boolean;
	disabled?: boolean;
	onToggle?: () => void;
	onMarkets?: () => void;
}

export function AutoStatusCard({
	on,
	title,
	subtitle,
	equity,
	markets,
	actionLabel,
	busy,
	disabled,
	onToggle,
	onMarkets,
}: Props) {
	return (
		<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
			<div className="flex items-center gap-3">
				<span
					className={cn(
						"grid size-9 shrink-0 place-items-center rounded-full",
						on ? "bg-success-soft text-market-up" : "bg-control-hover text-fg-muted",
					)}
				>
					{on ? <PlayIcon weight="fill" className="size-4" /> : <PauseIcon weight="fill" className="size-4" />}
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-medium">{title}</span>
					<span className="text-xs text-fg-muted tabular-nums">{subtitle}</span>
				</span>
				{onToggle && (
					<button
						type="button"
						onClick={onToggle}
						disabled={disabled || busy}
						className={cn(
							"inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors disabled:opacity-50",
							on ? "bg-control-hover text-fg hover:bg-fill-hover" : "bg-fill text-fg-inverse hover:opacity-90",
						)}
					>
						{busy && <SpinnerGapIcon className="size-3.5 animate-spin" />}
						{actionLabel}
					</button>
				)}
			</div>
			<div className="grid grid-cols-3 gap-2 text-xs">
				<Metric label="Account equity" value={equity} />
			</div>
			{onMarkets && markets && (
				<button
					type="button"
					onClick={onMarkets}
					className="group -mx-2 -mb-2 flex items-center gap-3 rounded-8 px-2 py-2 text-left transition-colors hover:bg-control-hover"
				>
					<AutoIconStack coins={markets} max={5} />
					<span className="flex-1 text-xs text-fg-secondary">
						{on ? "Trading " : ""}
						<span className="text-fg">{markets.length} markets</span>
						{on ? "" : " selected"}
					</span>
					<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
				</button>
			)}
		</div>
	);
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn("tabular-nums", className)}>{value}</span>
		</div>
	);
}
