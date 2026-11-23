import { CaretDownIcon } from "@phosphor-icons/react";
import { DemoCard } from "./card";
import type { MarketsProps } from "./data";
import { IconStack } from "./icon-stack";

export default function V5({ selected, onOpenEditor }: MarketsProps) {
	return (
		<DemoCard
			marketsCell={
				<button
					type="button"
					onClick={onOpenEditor}
					className="-m-1.5 flex flex-col gap-1 rounded-8 p-1.5 text-left transition-colors hover:bg-control-hover"
				>
					<span className="flex items-center gap-1 text-2xs text-fg-muted">
						Markets
						<CaretDownIcon weight="bold" className="size-2.5" />
					</span>
					<span className="flex items-center gap-1.5">
						<IconStack coins={selected} max={3} size="size-4" />
						<span className="tabular-nums">{selected.length}</span>
					</span>
				</button>
			}
		/>
	);
}
