import { CaretRightIcon } from "@phosphor-icons/react";
import { DemoCard } from "./card";
import type { MarketsProps } from "./data";
import { IconStack } from "./icon-stack";

export default function V1({ selected, onOpenEditor }: MarketsProps) {
	return (
		<DemoCard>
			<button
				type="button"
				onClick={onOpenEditor}
				className="-mx-2 -mb-2 flex items-center gap-3 rounded-8 px-2 py-2 text-left transition-colors hover:bg-control-hover"
			>
				<IconStack coins={selected} max={5} />
				<span className="flex-1 text-xs text-fg-secondary">
					Trading <span className="text-fg">{selected.length} markets</span>
				</span>
				<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
			</button>
		</DemoCard>
	);
}
