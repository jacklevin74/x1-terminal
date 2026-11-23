import { Identicon } from "./identicon";

interface Props {
	ids: string[];
	max?: number;
}

export function MemberStack({ ids, max = 7 }: Props) {
	return (
		<span className="flex items-center">
			{ids.slice(0, max).map((id, i) => (
				<span key={id} className="rounded-full ring-2 ring-control" style={{ marginLeft: i ? -6 : 0, zIndex: max - i }}>
					<Identicon id={id} className="size-6" />
				</span>
			))}
			{ids.length > max && <span className="pl-2 text-2xs text-fg-muted">+{ids.length - max}</span>}
		</span>
	);
}
