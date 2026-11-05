import { useState } from "react";
import { cn } from "@/lib/cn";
import { buildRollCells, getRollDirection, type RollDirection } from "@/lib/ui/rolling-number";

interface Props {
	value: string;
	className?: string;
}

interface RollState {
	value: string;
	prev: string | null;
	direction: RollDirection;
	id: number;
}

const ROLL_CLASSES: Record<RollDirection, { enter: string; exit: string }> = {
	up: { enter: "motion-safe:animate-roll-in-up", exit: "motion-safe:animate-roll-out-up" },
	down: { enter: "motion-safe:animate-roll-in-down", exit: "motion-safe:animate-roll-out-down" },
};

export function RollingNumber({ value, className }: Props) {
	const [roll, setRoll] = useState<RollState>({ value, prev: null, direction: "up", id: 0 });
	if (roll.value !== value) {
		setRoll({ value, prev: roll.value, direction: getRollDirection(roll.value, value), id: roll.id + 1 });
	}
	const cells = buildRollCells(roll.prev, value, roll.id);
	const classes = ROLL_CLASSES[roll.direction];

	return (
		<span className={cn("relative inline-block whitespace-nowrap tabular-nums", className)}>
			<span className="sr-only">{value}</span>
			<span aria-hidden="true">
				{cells.map((cell) =>
					cell.rolls ? (
						<span key={cell.key} className="relative inline-block [clip-path:inset(0_-2px)]">
							{cell.prevChar ? (
								<span className={cn("absolute inset-x-0 top-0 text-center motion-reduce:hidden", classes.exit)}>
									{cell.prevChar}
								</span>
							) : null}
							<span className={cn("inline-block", classes.enter)}>{cell.char}</span>
						</span>
					) : (
						<span key={cell.key}>{cell.char}</span>
					),
				)}
			</span>
		</span>
	);
}
