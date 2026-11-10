import { cn } from "@/lib/cn";
import { signedScore } from "@/lib/mood/signal";
import { MOOD_BACKS, MOOD_VARIANTS, useMoodVariantStore } from "@/stores/use-mood-variant-store";

export function MoodVariantSwitcher() {
	const { variant, preview, back, setVariant, setPreview, setBack } = useMoodVariantStore();
	const current = MOOD_VARIANTS.find((v) => v.id === variant);
	return (
		<div className="flex items-center gap-1.5" title="Mood Ring exploration. Pick a variant.">
			<span className="text-fg-muted">Mood</span>
			{MOOD_VARIANTS.map((v) => (
				<button
					key={v.id}
					type="button"
					onClick={() => setVariant(v.id)}
					title={v.label}
					className={cn(
						"grid h-4 min-w-4 place-items-center rounded-4 px-1 tabular-nums",
						variant === v.id ? "bg-fill text-fg-inverse" : "text-fg-muted hover:bg-fill-hover hover:text-fg",
					)}
				>
					{v.id}
				</button>
			))}
			<span className="text-fg-secondary">{current?.label}</span>
			{variant === 2 && (
				<>
					<span className="ml-2 text-fg-muted">Back</span>
					{MOOD_BACKS.map((b) => (
						<button
							key={b.id}
							type="button"
							onClick={() => setBack(b.id)}
							title={b.label}
							className={cn(
								"grid h-4 min-w-4 place-items-center rounded-4 px-1 tabular-nums",
								back === b.id ? "bg-fill text-fg-inverse" : "text-fg-muted hover:bg-fill-hover hover:text-fg",
							)}
						>
							{b.id}
						</button>
					))}
					<span className="text-fg-secondary">{MOOD_BACKS.find((b) => b.id === back)?.label}</span>
				</>
			)}
			<input
				type="range"
				min={-100}
				max={100}
				value={preview ?? 0}
				onChange={(e) => setPreview(Number(e.target.value))}
				className="ml-1 h-1 w-20 accent-current"
				aria-label="Simulate score"
				title="Simulate score"
			/>
			<button
				type="button"
				onClick={() => setPreview(null)}
				className={cn("tabular-nums", preview === null ? "text-fg" : "text-fg-muted hover:text-fg")}
			>
				{preview === null ? "Live" : signedScore(preview)}
			</button>
		</div>
	);
}
