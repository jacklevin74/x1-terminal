import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { accountSortButtonClass } from "./positions-panel-table-styles";

interface Props {
	label: string;
	descending: boolean;
	active?: boolean;
	onToggle: () => void;
}

export function SortHeadButton({ label, descending, active = true, onToggle }: Props) {
	const Icon = active && !descending ? CaretUpIcon : CaretDownIcon;
	return (
		<button type="button" onClick={onToggle} className={accountSortButtonClass}>
			{label}
			<Icon aria-hidden="true" weight="bold" className="size-3 text-fg-muted" />
		</button>
	);
}
