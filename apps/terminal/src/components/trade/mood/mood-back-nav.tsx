import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { moodColor, signedScore } from "@/lib/mood/signal";
import type { MoodBack } from "@/stores/use-mood-variant-store";

interface Props {
	style: MoodBack;
	name: string;
	score: number;
	index: number;
	total: number;
	onBack: () => void;
	onStep: (dir: -1 | 1) => void;
}

export function MoodBackNav({ style, name, score, index, total, onBack, onStep }: Props) {
	if (style === 1) {
		return (
			<button
				type="button"
				onClick={onBack}
				className="-ml-1.5 flex min-w-0 items-center gap-2 rounded-8 py-1 pr-2 pl-1 text-left transition-colors hover:bg-fill-hover"
			>
				<span className="grid size-7 flex-none place-items-center rounded-full bg-control">
					<CaretLeftIcon weight="bold" className="size-3.5" />
				</span>
				<span className="min-w-0">
					<span className="block truncate text-sm font-medium">{name}</span>
					<span className="block text-2xs text-fg-muted">All markets</span>
				</span>
			</button>
		);
	}
	if (style === 2) {
		return (
			<nav className="flex items-center gap-1.5 px-1 text-xs" aria-label="Breadcrumb">
				<button type="button" onClick={onBack} className="text-fg-muted transition-colors hover:text-fg">
					All markets
				</button>
				<CaretRightIcon className="size-3 text-fg-muted" />
				<span className="font-medium">{name}</span>
				<span className="tabular-nums" style={{ color: moodColor(score) }}>
					{signedScore(score)}
				</span>
			</nav>
		);
	}
	if (style === 3) {
		return (
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onBack}
					className="flex h-8 items-center gap-1.5 rounded-full bg-control pr-3.5 pl-2.5 text-xs font-medium transition-colors hover:bg-control-hover"
				>
					<CaretLeftIcon weight="bold" className="size-3.5" />
					All markets
				</button>
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
			</div>
		);
	}
	return (
		<button
			type="button"
			onClick={onBack}
			aria-label="Back to all markets"
			className="group absolute top-3 left-3 z-10 flex h-8 items-center overflow-hidden rounded-full bg-control-hover pr-2.5 pl-2 text-xs font-medium transition-colors hover:bg-fill-hover"
		>
			<CaretLeftIcon weight="bold" className="size-4 flex-none" />
			<span className="ml-1">All markets</span>
		</button>
	);
}
