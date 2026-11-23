import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import type { RangeId, SeriesId, TabId } from "../portfolio/data";
import { TabsBar } from "../portfolio/parts";
import { MobileTabRows, TabTable } from "../portfolio/tables";

export function useChartState() {
	const [series, setSeries] = useState<SeriesId>("value");
	const [range, setRange] = useState<RangeId>("month");
	return { series, setSeries, range, setRange };
}

export type ChartState = ReturnType<typeof useChartState>;

export function TextToggle<T extends string>({
	items,
	value,
	onChange,
	className,
	size = "xs",
}: {
	items: { id: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
	className?: string;
	size?: "xs" | "sm";
}) {
	return (
		<span className={cn("flex items-center gap-5", size === "xs" ? "text-xs" : "text-sm", className)}>
			{items.map((it) => (
				<button
					key={it.id}
					type="button"
					onClick={() => onChange(it.id)}
					className={cn(
						"transition-colors",
						value === it.id ? "font-medium text-fg" : "text-fg-muted hover:text-fg-secondary",
					)}
				>
					{it.label}
				</button>
			))}
		</span>
	);
}

export function Dropdown<T extends string>({
	items,
	value,
	onChange,
	align = "end",
}: {
	items: { id: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
	align?: "start" | "end";
}) {
	const current = items.find((i) => i.id === value);
	return (
		<Popover>
			<PopoverTrigger className="flex h-8 items-center gap-1.5 rounded-6 px-2 text-xs text-fg-secondary transition-colors hover:bg-control hover:text-fg">
				{current?.label}
				<CaretDownIcon className="size-3.5 text-fg-muted" />
			</PopoverTrigger>
			<PopoverContent align={align} className="w-44 p-1">
				{items.map((it) => (
					<button
						key={it.id}
						type="button"
						onClick={() => onChange(it.id)}
						className={cn(
							"flex h-8 w-full items-center justify-between rounded-4 px-2 text-xs hover:bg-control",
							it.id === value ? "text-fg" : "text-fg-secondary",
						)}
					>
						{it.label}
						{it.id === value && <CheckIcon className="size-3.5" />}
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}

export const enter = "duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-97";

export interface VariantProps {
	tab?: TabId;
}

interface PanelProps {
	tab: TabId;
	dense?: boolean;
}

export function TabPanel({ tab, dense }: PanelProps) {
	const [active, setActive] = useState<TabId>(tab);
	return (
		<section className="flex flex-col rounded-8 bg-surface">
			<div className={cn("border-b border-stroke-weak px-3", dense && "flex h-9 items-stretch")}>
				<TabsBar
					value={active}
					onChange={setActive}
					counts={dense ? "all" : "trade"}
					className={dense ? "h-9 flex-1" : undefined}
				/>
			</div>
			<TabTable tab={active} rowHeight={dense ? "h-8" : "h-9"} maxHeight={dense ? 640 : 420} />
		</section>
	);
}

export function MobileTabs({ tab, dense }: PanelProps) {
	const [active, setActive] = useState<TabId>(tab);
	return (
		<div className="mt-6 flex flex-col">
			<div className="border-b border-stroke-weak px-2">
				<TabsBar value={active} onChange={setActive} counts={dense ? "all" : "trade"} mobile />
			</div>
			<MobileTabRows tab={active} />
		</div>
	);
}
