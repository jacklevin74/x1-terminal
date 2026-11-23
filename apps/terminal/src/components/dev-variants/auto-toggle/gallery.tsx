import { type ComponentType, useState } from "react";
import type { Mode, Phase, ToggleProps } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<ToggleProps>; title: string }[] = [
	{ C: V1, title: "Title + icon switch" },
	{ C: V2, title: "Folder tabs fused into the panel" },
	{ C: V3, title: "Large text tabs with underline" },
	{ C: V4, title: "Mode cards with status line" },
	{ C: V5, title: "Lit track: glow under the Auto thumb" },
];

const STATES: { mode: Mode; phase: Phase; label: string }[] = [
	{ mode: "manual", phase: "active", label: "Manual" },
	{ mode: "auto", phase: "active", label: "Auto · active" },
	{ mode: "auto", phase: "paused", label: "Auto · paused" },
];

function Panel({ C, initial }: { C: ComponentType<ToggleProps>; initial: (typeof STATES)[number] }) {
	const [mode, setMode] = useState<Mode>(initial.mode);
	const phase = initial.phase;
	let src = "/dev-refs/auto-toggle/manual.png";
	if (mode === "auto") src = phase === "active" ? "/dev-refs/auto-toggle/auto.png" : "/dev-refs/auto-toggle/paused.png";
	return (
		<div className="w-[328px] overflow-hidden rounded-8 bg-surface">
			<C mode={mode} phase={phase} onMode={setMode} />
			<img src={src} alt="" className="mt-2 block w-[328px]" />
		</div>
	);
}

export function AutoToggleGallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			{variants.map(({ C, title }, i) => (
				<section key={title} className="flex min-h-screen flex-col gap-6 px-10 py-8">
					<div className="flex items-center gap-3 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span>{title}</span>
					</div>
					<div className="flex flex-wrap items-start gap-10">
						{STATES.map((s) => (
							<div key={s.label} className="flex flex-col gap-2">
								<span className="text-2xs tracking-micro text-fg-muted uppercase">{s.label}</span>
								<Panel C={C} initial={s} />
							</div>
						))}
					</div>
				</section>
			))}
		</main>
	);
}
