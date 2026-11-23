import { CaretRightIcon } from "@phosphor-icons/react";
import { DemoCard } from "./card";
import type { MarketsProps } from "./data";
import { IconStack } from "./icon-stack";

export default function V3({ selected, onOpenEditor }: MarketsProps) {
	return (
		<>
			<DemoCard />
			<button
				type="button"
				onClick={onOpenEditor}
				className="flex h-12 items-center gap-3 rounded-8 bg-control px-3 text-left transition-colors hover:bg-control-hover"
			>
				<span className="flex-1 text-xs text-fg-muted">Markets</span>
				<IconStack coins={selected} max={3} />
				<span className="text-xs tabular-nums">{selected.length}</span>
				<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
			</button>
		</>
	);
}
