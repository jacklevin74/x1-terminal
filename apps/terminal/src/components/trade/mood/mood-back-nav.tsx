import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

export function MoodBackPill({ onBack }: { onBack: () => void }) {
	return (
		<button
			type="button"
			onClick={onBack}
			className="flex h-8 items-center gap-1.5 rounded-full bg-control pr-3.5 pl-2.5 text-xs font-medium transition-colors hover:bg-control-hover"
		>
			<CaretLeftIcon weight="bold" className="size-3.5" />
			All markets
		</button>
	);
}

interface StepperProps {
	index: number;
	total: number;
	onStep: (dir: -1 | 1) => void;
}

export function MoodMarketStepper({ index, total, onStep }: StepperProps) {
	return (
		<div className="flex h-8 items-center rounded-full bg-control text-xs">
			<button
				type="button"
				onClick={() => onStep(-1)}
				disabled={index <= 0}
				className="grid size-8 place-items-center rounded-full transition-colors hover:bg-control-hover disabled:opacity-40 disabled:hover:bg-transparent"
				aria-label="Previous market"
			>
				<CaretLeftIcon className="size-3.5" />
			</button>
			<span className="px-1 tabular-nums text-fg-muted">
				{index + 1} / {total}
			</span>
			<button
				type="button"
				onClick={() => onStep(1)}
				disabled={index >= total - 1}
				className="grid size-8 place-items-center rounded-full transition-colors hover:bg-control-hover disabled:opacity-40 disabled:hover:bg-transparent"
				aria-label="Next market"
			>
				<CaretRightIcon className="size-3.5" />
			</button>
		</div>
	);
}
