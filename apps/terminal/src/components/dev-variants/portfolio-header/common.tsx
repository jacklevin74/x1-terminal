import { CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";
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

export function AccountChip({ size = "sm", className }: { size?: "sm" | "md"; className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-2 text-fg-secondary tabular-nums",
				size === "sm" ? "text-xs" : "text-sm",
				className,
			)}
		>
			<Identicon id={ADDRESS} className={size === "sm" ? "size-5 rounded-4" : "size-7 rounded-6"} />
			{SHORT_ADDRESS}
			<CopyIcon className="size-3.5 text-fg-muted" />
		</span>
	);
}

/** Text toggles, Hyperdash style: active white, others muted. No surface. */
export function TextToggle<T extends string>({
	items,
	value,
	onChange,
	className,
}: {
	items: { id: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
	className?: string;
}) {
	return (
		<span className={cn("flex items-center gap-4 text-xs", className)}>
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

/** Underline tabs inside a card header. The hairline sits under these tabs only. */
export function UnderlineTabs<T extends string>({
	items,
	value,
	onChange,
	right,
}: {
	items: { id: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
	right?: React.ReactNode;
}) {
	return (
		<div className="flex h-10 items-stretch justify-between border-b border-stroke-weak px-4">
			<span className="flex gap-5">
				{items.map((it) => (
					<button
						key={it.id}
						type="button"
						onClick={() => onChange(it.id)}
						className={cn(
							"relative text-xs transition-colors",
							value === it.id ? "text-fg" : "text-fg-muted hover:text-fg-secondary",
						)}
					>
						{it.label}
						{value === it.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-fg" />}
					</button>
				))}
			</span>
			{right && <span className="flex items-center">{right}</span>}
		</div>
	);
}
