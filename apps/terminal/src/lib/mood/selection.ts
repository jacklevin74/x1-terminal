import { membersOrDefault, onIds } from "@/components/trade/auto/copy/basket";
import { setAutoMembers, useAutoChoiceStore } from "@/stores/use-auto-choice-store";

export function useMoodSelection(): ReadonlySet<string> {
	const members = useAutoChoiceStore((s) => s.members);
	return new Set(onIds(membersOrDefault(members)));
}

export function toggleMoodTrader(id: string) {
	const usr = id.toLowerCase();
	const members = membersOrDefault(useAutoChoiceStore.getState().members);
	const found = members.some((m) => m.id === usr);
	const next = found
		? members.map((m) => (m.id === usr ? { ...m, on: !m.on } : m))
		: [...members, { id: usr, on: true }];
	setAutoMembers(next);
}

export function countAllMoodTraders(ids: readonly string[]) {
	const pool = new Set(ids.map((i) => i.toLowerCase()));
	const members = membersOrDefault(useAutoChoiceStore.getState().members);
	const known = new Set(members.map((m) => m.id));
	setAutoMembers([
		...members.map((m) => (pool.has(m.id) ? { ...m, on: true } : m)),
		...[...pool].filter((id) => !known.has(id)).map((id) => ({ id, on: true })),
	]);
}
