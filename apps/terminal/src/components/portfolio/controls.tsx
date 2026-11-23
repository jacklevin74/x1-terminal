import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import type { RangeId, SeriesId } from "@/lib/portfolio/model";

export function useChartState() {
	const [series, setSeries] = useState<SeriesId>("value");
	const [range, setRange] = useState<RangeId>("month");
	return { series, setSeries, range, setRange };
}

export type ChartState = ReturnType<typeof useChartState>;

export const enter = "duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-97";

interface ToggleProps<T extends string> {
	items: { id: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
}

export function TextToggle<T extends string>({ items, value, onChange }: ToggleProps<T>) {
	return (
		<span className="flex items-center gap-5 text-xs">
			{items.map((it) => (
				<button
					key={it.id}
					type="button"
					aria-pressed={value === it.id}
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

export function Dropdown<T extends string>({ items, value, onChange }: ToggleProps<T>) {
	const [open, setOpen] = useState(false);
	const current = items.find((i) => i.id === value);

	function select(id: T) {
		onChange(id);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger className="flex h-8 items-center gap-1.5 rounded-6 px-2 text-xs text-fg-secondary transition-colors hover:bg-control hover:text-fg">
				{current?.label}
				<CaretDownIcon className="size-3.5 text-fg-muted" />
			</PopoverTrigger>
			<PopoverContent align="end" className="w-44 p-1">
				{items.map((it) => (
					<button
						key={it.id}
						type="button"
						onClick={() => select(it.id)}
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
