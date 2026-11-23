import { type ComponentType, useState } from "react";
import { AutoMarketsModal } from "@/components/trade/auto/auto-markets-modal";
import { AutoSettingsForm } from "@/components/trade/auto/auto-settings-form";
import { ALL_MARKETS, type MarketsProps } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<MarketsProps>; title: string }[] = [
	{ C: V1, title: "Icon stack row inside the status card" },
	{ C: V2, title: "Removable market chips with Add" },
	{ C: V3, title: "Settings row with icons and chevron" },
	{ C: V4, title: "Tap-to-toggle market grid" },
	{ C: V5, title: "Icon stack in the Markets metric" },
];

const BASE = { leverage: 3, killPct: 0.1, exclude: [], minOrderUsd: 10, flowPct: 40 };

function Panel({ C }: { C: ComponentType<MarketsProps> }) {
	const [selected, setSelected] = useState<string[]>(ALL_MARKETS.slice(0, 12));
	const [editing, setEditing] = useState(false);
	function toggle(coin: string) {
		setSelected((s) =>
			s.includes(coin) ? s.filter((c) => c !== coin) : ALL_MARKETS.filter((m) => m === coin || s.includes(m)),
		);
	}
	return (
		<div className="w-[328px] overflow-hidden rounded-8 bg-surface">
			<div className="flex h-9 bg-background text-xs">
				<span className="flex flex-1 items-center justify-center text-fg-muted">Manual</span>
				<span className="flex flex-1 items-center justify-center rounded-t-8 bg-surface font-medium">Auto</span>
			</div>
			<div className="flex flex-col gap-4 px-3 pt-4 pb-4">
				<C selected={selected} onToggle={toggle} onOpenEditor={() => setEditing(true)} />
				<AutoSettingsForm saved={{ ...BASE, include: selected }} saving={false} disabled={false} onSave={() => {}} />
			</div>
			<AutoMarketsModal
				open={editing}
				settings={{ ...BASE, include: selected }}
				universe={ALL_MARKETS}
				saving={false}
				onClose={() => setEditing(false)}
				onSave={(next) => {
					setSelected(next.include ?? ALL_MARKETS);
					setEditing(false);
				}}
			/>
		</div>
	);
}

export function AutoMarketsGallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<div className="flex flex-wrap items-start gap-10 px-10 py-10">
				{variants.map(({ C, title }, i) => (
					<section key={title} className="flex flex-col gap-3">
						<div className="flex items-center gap-3 text-xs">
							<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
							<span>{title}</span>
						</div>
						<Panel C={C} />
					</section>
				))}
			</div>
		</main>
	);
}
