import { Select } from "@hypeterminal/ui";

interface Option {
	value: string;
	label: string;
}

interface Props {
	label: string;
	ariaLabel: string;
	value: string;
	options: Option[];
	onChange: (value: string) => void;
}

export function AccountFilterSelect({ label, ariaLabel, value, options, onChange }: Props) {
	return (
		<Select
			variant="text"
			aria-label={ariaLabel}
			placeholder={label}
			value={value}
			options={[{ value: "", label }, ...options]}
			onValueChange={(next) => onChange(next ?? "")}
			className="shrink-0"
			triggerClassName="max-w-32 max-md:h-8"
		/>
	);
}
