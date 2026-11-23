import { type ComponentType, type ReactNode, useState } from "react";
import { ALL, type Change, EDIT_ORDER, type Props, type Scene, scoreOf } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<Props>; title: string }[] = [
	{ C: V1, title: "Split bar with three counts; Edit opens a Traders page with switches" },
	{ C: V2, title: "Three count tiles; Choose traders expands a grouped checklist in the card" },
	{ C: V3, title: "One compact row with icon counts; it opens a sheet with search" },
	{ C: V4, title: "One dot per trader in three groups; Edit traders turns the groups into tabs with In or Out" },
	{ C: V5, title: "Three-line ledger with long and short size; Customize opens a draft page with Apply" },
];

interface State {
	selected: Set<string>;
	changes: Change[];
	seq: number;
}

function initial(edited: boolean): State {
	const selected = new Set(ALL);
	const changes: Change[] = [];
	if (!edited) return { selected, changes, seq: 0 };
	for (const usr of EDIT_ORDER) {
		const before = scoreOf(selected);
		selected.delete(usr);
		changes.push({ id: changes.length + 1, usr, added: false, before, after: scoreOf(selected) });
	}
	return { selected, changes, seq: changes.length };
}

function Live({ C, edited, scene }: { C: ComponentType<Props>; edited: boolean; scene: Scene }) {
	const [state, setState] = useState(() => initial(edited));

	function toggle(usr: string) {
		setState((s) => {
			const selected = new Set(s.selected);
			const before = scoreOf(selected);
			const added = !selected.has(usr);
			if (added) selected.add(usr);
			else selected.delete(usr);
			const id = s.seq + 1;
			return { selected, seq: id, changes: [...s.changes, { id, usr, added, before, after: scoreOf(selected) }] };
		});
	}
	function undo() {
		setState((s) => {
			const c = s.changes.at(-1);
			if (!c) return s;
			const selected = new Set(s.selected);
			if (c.added) selected.delete(c.usr);
			else selected.add(c.usr);
			return { selected, seq: s.seq + 1, changes: s.changes.slice(0, -1) };
		});
	}
	function replace(next: Set<string>) {
		setState((s) => ({ selected: next, changes: [], seq: s.seq + 1 }));
	}

	return (
		<C
			selected={state.selected}
			changes={state.changes}
			last={null}
			toggle={toggle}
			undo={undo}
			reset={() => replace(new Set(ALL))}
			replace={replace}
			edited={edited}
			scene={scene}
		/>
	);
}

export function MoodTraders3Gallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<p className="max-w-4xl px-10 pt-8 text-xs text-fg-muted">
				Real pool snapshot (37 traders, HYPE positions), from round 1. Bullish means long HYPE, bearish means short
				HYPE, neutral means no HYPE position. The default view shows only the counts. The trader list opens on request.
				Third frame: the default view after 8 traders are removed (the 8 with the lowest all-time PNL).
			</p>
			{variants.map(({ C, title }, i) => (
				<section key={title} className="flex flex-col gap-6 px-10 py-8">
					<div className="flex items-center gap-3 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span>{title}</span>
					</div>
					<div className="flex flex-wrap items-start gap-10">
						<Shot label="Default">
							<Live C={C} edited={false} scene="default" />
						</Shot>
						<Shot label="Edit opened">
							<Live C={C} edited={false} scene="editing" />
						</Shot>
						<Shot label="Default after 8 removed">
							<Live C={C} edited scene="default" />
						</Shot>
					</div>
				</section>
			))}
		</main>
	);
}

function Shot({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			{children}
		</div>
	);
}
