import { PlayIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface Props {
	marketsCell?: ReactNode;
	children?: ReactNode;
}

export function DemoCard({ marketsCell, children }: Props) {
	return (
		<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
			<div className="flex items-center gap-3">
				<span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-market-up">
					<PlayIcon weight="fill" className="size-4" />
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-medium">Trading</span>
					<span className="text-xs text-fg-muted tabular-nums">Next cycle in 3:08</span>
				</span>
				<span className="inline-flex h-8 shrink-0 items-center rounded-full bg-control-hover px-3.5 text-xs font-medium">
					Pause
				</span>
			</div>
			<div className="grid grid-cols-3 gap-2 text-xs">
				<div className="flex flex-col gap-0.5">
					<span className="text-2xs text-fg-muted">Equity</span>
					<span className="tabular-nums">$1,243.50</span>
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="text-2xs text-fg-muted">Day PNL</span>
					<span className="tabular-nums text-market-up">+$18.42</span>
				</div>
				{marketsCell}
			</div>
			{children}
		</div>
	);
}
