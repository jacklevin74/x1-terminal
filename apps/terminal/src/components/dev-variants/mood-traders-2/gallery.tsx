import { type ComponentType, useState } from "react";
import { ALL, type BasketProps, type Change, EDIT_ORDER, scoreOf } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<BasketProps>; title: string }[] = [
	{ C: V1, title: "Counting and Excluded groups, sticky before/after bar" },
	{ C: V2, title: "Seat map of 37 tiles, empty seats for excluded" },
	{ C: V3, title: "Per-row score impact, struck-through rows, undo toast" },
	{ C: V4, title: "Pool vs yours comparison with a change log" },
	{ C: V5, title: "Edit mode with a draft, preview and apply" },
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

function Live({ C, edited }: { C: ComponentType<BasketProps>; edited: boolean }) {
	const [state, setState] = useState(() => initial(edited));
	const [lastId, setLastId] = useState<number | null>(null);

	function toggle(usr: string) {
		setState((s) => {
			const selected = new Set(s.selected);
			const before = scoreOf(selected);
			const added = !selected.has(usr);
			if (added) selected.add(usr);
			else selected.delete(usr);
			const id = s.seq + 1;
			setLastId(id);
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
			const id = s.seq + 1;
			setLastId(id);
			return { selected, seq: id, changes: s.changes.slice(0, -1) };
		});
	}
	function reset() {
		setLastId(null);
		setState((s) => ({ selected: new Set(ALL), changes: [], seq: s.seq + 1 }));
	}
	function replace(next: Set<string>) {
		setLastId(null);
		setState((s) => ({ selected: next, changes: [], seq: s.seq + 1 }));
	}

	const tail = state.changes.at(-1) ?? null;
	const last = tail && tail.id === lastId ? tail : null;
	return (
		<C
			selected={state.selected}
			changes={state.changes}
			last={last}
			toggle={toggle}
			undo={undo}
			reset={reset}
			replace={replace}
			edited={edited}
		/>
	);
}

export function MoodTraders2Gallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<p className="px-10 pt-8 text-xs text-fg-muted">
				Real pool snapshot (37 traders, HYPE positions), from round 1. Edited state: the 8 traders with the lowest
				all-time PNL are removed, which moves HYPE from +20 to +4. Score = 0.6 × position score of the counted traders +
				0.4 × pool order flow. Traders with no HYPE position do not move the HYPE score.
			</p>
			{variants.map(({ C, title }, i) => (
				<section key={title} className="flex flex-col gap-6 px-10 py-8">
					<div className="flex items-center gap-3 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span>{title}</span>
					</div>
					<div className="flex flex-wrap items-start gap-10">
						<Scene label="Default (all 37 in)">
							<Live C={C} edited={false} />
						</Scene>
						<Scene label="Edited (8 removed)">
							<Live C={C} edited />
						</Scene>
					</div>
				</section>
			))}
		</main>
	);
}

function Scene({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			{children}
		</div>
	);
}
