import { Checkbox } from "@hypeterminal/ui";

interface Props {
	label: string;
	ariaLabel?: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}

export function ToolbarCheckbox({ label, ariaLabel, checked, onCheckedChange }: Props) {
	return (
		<Checkbox
			label={label}
			aria-label={ariaLabel}
			checked={checked}
			onCheckedChange={(next) => onCheckedChange(next === true)}
			className="shrink-0 items-center"
		/>
	);
}
