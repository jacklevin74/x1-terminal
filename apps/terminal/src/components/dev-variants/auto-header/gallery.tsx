import { type ComponentType, useEffect, useState } from "react";
import { StatBlock } from "@/components/trade/chart/stat-block";
import { type HeaderProps, LABEL, PHASES, type Phase } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";
import V6 from "./v6";
import V7 from "./v7";
import V8 from "./v8";
import V9 from "./v9";
import V10 from "./v10";
import V11 from "./v11";
import V12 from "./v12";

const variants: { C: ComponentType<HeaderProps>; title: string }[] = [
	{ C: V1, title: "Plain stat, colored state, details in tooltip" },
	{ C: V2, title: "Filled status pill with play/pause icon" },
	{ C: V3, title: "Icon button with status badge" },
	{ C: V4, title: "Stat with cycle countdown bar" },
	{ C: V5, title: "Stat with on/off switch" },
	{ C: V6, title: "State tag in label, day PNL as value" },
	{ C: V7, title: "Cycle ring like the mood ring" },
	{ C: V8, title: "Manual / Auto segment in the header" },
	{ C: V9, title: "Traded markets as an icon stack" },
	{ C: V10, title: "Activity bars that move while live" },
	{ C: V11, title: "Welded status and pause button" },
	{ C: V12, title: "Day PNL with equity sparkline" },
];

function useCountdown() {
	const [left, setLeft] = useState(192);
	useEffect(() => {
		const t = setInterval(() => setLeft((s) => (s <= 0 ? 300 : s - 1)), 1000);
		return () => clearInterval(t);
	}, []);
	return left;
}

function Row({ C, initial }: { C: ComponentType<HeaderProps>; initial: Phase }) {
	const [phase, setPhase] = useState<Phase>(initial);
	const left = useCountdown();
	return (
		<div className="flex h-14 items-center gap-6 rounded-8 bg-surface px-4">
			<span className="w-16 text-2xs uppercase tracking-micro text-fg-disabled">{LABEL[initial]}</span>
			<StatBlock label="Open int" value="$1.82B" />
			<StatBlock label="Funding" value="+0.0013%" valueClass="text-market-up" />
			<C
				phase={phase}
				dayPnl="+$18.42"
				dayUp
				markets={18}
				next={`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
				progress={1 - left / 300}
				onToggle={() => setPhase((p) => (p === "active" ? "paused" : "active"))}
			/>
			<StatBlock label="Mood" value="−18 Neutral" valueClass="text-market-down" />
		</div>
	);
}

export function AutoHeaderGallery() {
	return (
		<main className="dark min-h-screen bg-background p-6 text-fg">
			<div className="mx-auto flex max-w-4xl flex-col gap-10">
				{variants.map(({ C, title }, i) => (
					<section key={title} className="flex flex-col gap-2">
						<div className="flex items-center gap-3 text-xs">
							<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
							<span>{title}</span>
						</div>
						{PHASES.map((p) => (
							<Row key={p} C={C} initial={p} />
						))}
					</section>
				))}
			</div>
		</main>
	);
}
