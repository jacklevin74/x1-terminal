import type { PositionSort, PositionSortKey } from "@/lib/positions/sort-positions";
export function PositionSortLabel({ label, field, sort, onSort }: {
 label: string; field: PositionSortKey; sort: PositionSort; onSort: (field: PositionSortKey) => void;
}) {
 const active = sort.key === field;
 return <button type="button" onClick={() => onSort(field)} aria-label={`Sort by ${label}`} title={`Sort by ${label}${active ? sort.descending ? " (descending)" : " (ascending)" : ""}`} className="inline-flex items-center gap-1 whitespace-nowrap hover:text-fg focus-visible:outline-2 focus-visible:outline-stroke-focus">
  {label}<span aria-hidden="true" className={active ? "text-fg" : "opacity-40"}>{active ? sort.descending ? "⌄" : "⌃" : "↕"}</span>
 </button>;
}
