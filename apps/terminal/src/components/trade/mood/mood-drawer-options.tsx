import { cn } from "@/lib/cn";
import { MOOD_GAUGES, useMoodVariantStore } from "@/stores/use-mood-variant-store";

export function MoodDrawerOptions() {
	const { gauge, setGauge } = useMoodVariantStore();
	return (
		<div className="flex flex-none flex-col gap-1.5 bg-surface px-4 py-2.5 text-xs">
			<OptionRow label="Gauge" items={MOOD_GAUGES} value={gauge} onPick={(id) => setGauge(id as typeof gauge)} />
		</div>
	);
}

function OptionRow({
	label,
	items,
	value,
	onPick,
	note,
}: {
	label: string;
	items: { id: number; label: string }[];
	value: number;
	onPick: (id: number) => void;
	note?: string;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<span className="w-11 text-fg-muted">{label}</span>
			{items.map((item) => (
				<button
					key={item.id}
					type="button"
					onClick={() => onPick(item.id)}
					title={item.label}
					className={cn(
						"grid size-6 place-items-center rounded-6 tabular-nums transition-colors",
						value === item.id ? "bg-fill text-fg-inverse" : "bg-control text-fg-muted hover:text-fg",
					)}
				>
					{item.id}
				</button>
			))}
			<span className="ml-1 truncate text-fg-secondary" title={note}>
				{items.find((item) => item.id === value)?.label}
			</span>
		</div>
	);
}
