import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { Identicon } from "../copy-trader-2/identicon";
import { PortfolioChart } from "../portfolio/chart";
import {
	ADDRESS,
	account,
	lastOf,
	pnlClass,
	RANGES,
	type RangeId,
	rangeStats,
	SERIES,
	type SeriesId,
	SHORT_ADDRESS,
	signedUsd,
	usd,
} from "../portfolio/data";

export {
	ADDRESS,
	account,
	RANGES,
	SERIES,
	SHORT_ADDRESS,
	lastOf,
	pnlClass,
	rangeStats,
	signedUsd,
	usd,
	PortfolioChart,
	Identicon,
	cn,
};
export type { RangeId, SeriesId };

export function useChartState() {
	const [series, setSeries] = useState<SeriesId>("value");
	const [range, setRange] = useState<RangeId>("month");
	return { series, setSeries, range, setRange };
}

export const rangeLong = (r: RangeId) => RANGES.find((x) => x.id === r)?.long ?? "";
export const seriesLabel = (s: SeriesId) => SERIES.find((x) => x.id === s)?.label ?? "";

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
