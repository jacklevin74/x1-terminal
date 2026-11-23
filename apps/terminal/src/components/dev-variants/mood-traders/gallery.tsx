import { type ComponentType, useState } from "react";
import { ALL, type VariantProps } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<VariantProps>; title: string }[] = [
	{ C: V1, title: "Checklist inside the drawer" },
	{ C: V2, title: "Second drawer page with switches" },
	{ C: V3, title: "Address chips with a detail strip" },
	{ C: V4, title: "Long and short columns with per-side switches" },
	{ C: V5, title: "Presets: all, top 10 by PNL, consistent, my picks" },
];

function Live({ C }: { C: ComponentType<VariantProps> }) {
	const [selected, setSelected] = useState<Set<string>>(() => new Set(ALL));
	return <C selected={selected} onChange={setSelected} />;
}

export function MoodTradersGallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<p className="px-10 pt-8 text-xs text-fg-muted">
				Real pool snapshot (37 traders, HYPE positions). Score = 0.6 × position score of the selected traders + 0.4 ×
				pool order flow.
			</p>
			{variants.map(({ C, title }, i) => (
				<section key={title} className="flex flex-col gap-6 px-10 py-8">
					<div className="flex items-center gap-3 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span>{title}</span>
					</div>
					<Live C={C} />
				</section>
			))}
		</main>
	);
}
