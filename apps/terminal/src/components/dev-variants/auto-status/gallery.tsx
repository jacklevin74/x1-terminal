import { type ComponentType, useEffect, useState } from "react";
import { AutoSettingsForm } from "@/components/trade/auto/auto-settings-form";
import type { Phase, StatusProps } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<StatusProps>; title: string }[] = [
	{ C: V1, title: "Status card with inline action" },
	{ C: V2, title: "Horizon glow when live" },
	{ C: V3, title: "Cycle countdown ring" },
	{ C: V4, title: "Status pill + metric tiles" },
	{ C: V5, title: "Power switch row" },
];

const SETTINGS = { leverage: 3, killPct: 0.1, include: null, exclude: [], minOrderUsd: 10 };

function useCountdown() {
	const [left, setLeft] = useState(192);
	useEffect(() => {
		const t = setInterval(() => setLeft((s) => (s <= 0 ? 300 : s - 1)), 1000);
		return () => clearInterval(t);
	}, []);
	return left;
}

function Panel({ C, initial }: { C: ComponentType<StatusProps>; initial: Phase }) {
	const [phase, setPhase] = useState<Phase>(initial);
	const left = useCountdown();
	const props: StatusProps = {
		phase,
		equity: "$1,243.50",
		dayPnl: "+$18.42",
		dayUp: true,
		markets: 18,
		next: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`,
		progress: 1 - left / 300,
		onToggle: () => setPhase((p) => (p === "active" ? "paused" : "active")),
	};
	return (
		<div className="w-[328px] overflow-hidden rounded-8 bg-surface">
			<div className="flex h-9 bg-background text-xs">
				<span className="flex flex-1 items-center justify-center text-fg-muted">Manual</span>
				<span className="flex flex-1 items-center justify-center rounded-t-8 bg-surface font-medium">Auto</span>
			</div>
			<div className="flex flex-col gap-4 px-3 pt-4 pb-4">
				<C {...props} />
				<AutoSettingsForm saved={SETTINGS} saving={false} disabled={false} onSave={() => {}} />
			</div>
		</div>
	);
}

export function AutoStatusGallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			{variants.map(({ C, title }, i) => (
				<section key={title} className="flex flex-col gap-6 px-10 py-10">
					<div className="flex items-center gap-3 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span>{title}</span>
					</div>
					<div className="flex flex-wrap items-start gap-10">
						{(["active", "paused"] as const).map((p) => (
							<div key={p} className="flex flex-col gap-2">
								<span className="text-2xs tracking-micro text-fg-muted uppercase">{p}</span>
								<Panel C={C} initial={p} />
							</div>
						))}
					</div>
				</section>
			))}
		</main>
	);
}
