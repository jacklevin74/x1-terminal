import { act, type ChangeEvent, createContext, createElement, type ReactNode, useContext } from "react";

type AnyProps = Record<string, unknown> & { children?: ReactNode };

const VARIANT_PROPS = [
	"variant",
	"intent",
	"size",
	"tone",
	"band",
	"fullWidth",
	"iconLeft",
	"iconRight",
	"inputSize",
	"underline",
	"showClose",
	"divider",
] as const;

function stripVariantProps(props: AnyProps): AnyProps {
	const rest: AnyProps = { ...props };
	for (const key of VARIANT_PROPS) delete rest[key];
	return rest;
}

function passthrough({ children }: AnyProps) {
	return createElement("div", null, children);
}

function tag(name: string) {
	return function Tag(props: AnyProps) {
		const { children, ...rest } = stripVariantProps(props);
		return createElement(name, rest, children);
	};
}

function MockButton(props: AnyProps) {
	const { children, iconLeft, iconRight } = props;
	const { children: _children, ...rest } = stripVariantProps(props);
	return createElement("button", { type: "button", ...rest }, iconLeft as ReactNode, children, iconRight as ReactNode);
}

interface CheckboxProps {
	label?: ReactNode;
	checked?: boolean;
	defaultChecked?: boolean;
	disabled?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	"aria-label"?: string;
}

function MockCheckbox({
	label,
	checked,
	defaultChecked,
	disabled,
	onCheckedChange,
	"aria-label": ariaLabel,
}: CheckboxProps) {
	const input = createElement("input", {
		type: "checkbox",
		checked,
		defaultChecked,
		disabled,
		"aria-label": ariaLabel,
		onChange: (event: ChangeEvent<HTMLInputElement>) => onCheckedChange?.(event.target.checked),
	});
	if (!label) return input;
	return createElement("label", null, input, label);
}

interface Option {
	value: string;
	label: string;
}

interface SelectProps {
	options: (Option | { label: string; options: Option[] })[];
	value?: string | null;
	defaultValue?: string | null;
	onValueChange?: (value: string | null) => void;
	disabled?: boolean;
	"aria-label"?: string;
	label?: string;
}

function flattenOptions(options: SelectProps["options"]): Option[] {
	return options.flatMap((option) => ("options" in option ? option.options : [option]));
}

function MockSelect({
	options,
	value,
	defaultValue,
	onValueChange,
	disabled,
	"aria-label": ariaLabel,
	label,
}: SelectProps) {
	return createElement(
		"select",
		{
			"aria-label": ariaLabel ?? label,
			value: value === undefined ? undefined : (value ?? ""),
			defaultValue: defaultValue ?? undefined,
			disabled,
			onChange: (event: ChangeEvent<HTMLSelectElement>) => onValueChange?.(event.target.value),
		},
		flattenOptions(options).map((option) =>
			createElement("option", { key: option.value, value: option.value }, option.label),
		),
	);
}

interface DropdownItem {
	label: string;
	disabled?: boolean;
	active?: boolean;
	onSelect?: () => void;
}

interface DropdownProps {
	trigger?: ReactNode;
	triggerAriaLabel?: string;
	items?: DropdownItem[];
	groups?: { label?: string; items: DropdownItem[] }[];
	disabled?: boolean;
}

function MockDropdown({ trigger, triggerAriaLabel, items, groups, disabled }: DropdownProps) {
	const all = [...(items ?? []), ...(groups ?? []).flatMap((group) => group.items)];
	return createElement(
		"div",
		{ "data-dropdown": triggerAriaLabel ?? "" },
		trigger ? createElement("span", { "data-dropdown-trigger": true }, trigger) : null,
		all.map((item) =>
			createElement(
				"button",
				{
					key: item.label,
					type: "button",
					role: "menuitem",
					disabled: disabled || item.disabled,
					"aria-current": item.active ? "true" : undefined,
					onClick: item.onSelect,
				},
				item.label,
			),
		),
	);
}

interface SegmentedContextValue {
	value?: string;
	onValueChange?: (value: string) => void;
	disabled?: boolean;
}

const SegmentedContext = createContext<SegmentedContextValue>({});

interface SegmentedControlsProps extends SegmentedContextValue {
	children?: ReactNode;
	"aria-label"?: string;
}

function MockSegmentedControls({
	children,
	value,
	onValueChange,
	disabled,
	"aria-label": ariaLabel,
}: SegmentedControlsProps) {
	return createElement(
		SegmentedContext.Provider,
		{ value: { value, onValueChange, disabled } },
		createElement("div", { role: "radiogroup", "aria-label": ariaLabel }, children),
	);
}

interface SegmentedControlItemProps {
	value: string;
	children?: ReactNode;
	disabled?: boolean;
	"aria-label"?: string;
}

function MockSegmentedControlItem({ value, children, disabled, "aria-label": ariaLabel }: SegmentedControlItemProps) {
	const group = useContext(SegmentedContext);
	return createElement(
		"button",
		{
			type: "button",
			role: "radio",
			"data-value": value,
			"aria-label": ariaLabel,
			"aria-checked": group.value === value,
			disabled: group.disabled || disabled,
			onClick: () => group.onValueChange?.(value),
		},
		children,
	);
}

function MockTooltip({ children }: AnyProps) {
	return createElement("span", null, children);
}

export function createUiMock() {
	return {
		Badge: tag("span"),
		Button: MockButton,
		ButtonIcon: MockButton,
		Checkbox: MockCheckbox,
		Dropdown: MockDropdown,
		Modal: passthrough,
		ModalClose: passthrough,
		ModalContent: passthrough,
		ModalDescription: passthrough,
		ModalFooter: passthrough,
		ModalHeader: passthrough,
		ModalPopup: passthrough,
		ModalTitle: passthrough,
		SegmentedControlItem: MockSegmentedControlItem,
		SegmentedControls: MockSegmentedControls,
		Select: MockSelect,
		Table: tag("table"),
		TableBody: tag("tbody"),
		TableCell: tag("td"),
		TableHead: tag("th"),
		TableHeader: tag("thead"),
		TableRow: tag("tr"),
		Tabs: passthrough,
		TabsContent: passthrough,
		TabsList: passthrough,
		TabsTrigger: tag("button"),
		Tag: tag("span"),
		Tooltip: MockTooltip,
		TooltipProvider: passthrough,
		fieldErrorClass: "",
		fieldInlineLabelClass: "",
		fieldLabelClass: "",
		fieldSuffixClass: "",
		menuGroupLabelClass: "",
		menuItemClass: "",
		menuPopupClass: "",
		menuSeparatorClass: "",
		tooltipUnderlineClass: "",
	};
}

interface Choice {
	value: string;
	label: string;
}

function findChoiceControl(root: ParentNode, ariaLabel: string) {
	const select = root.querySelector<HTMLSelectElement>(`select[aria-label="${ariaLabel}"]`);
	if (select) return { kind: "select" as const, element: select };
	const group = root.querySelector<HTMLElement>(`[role="radiogroup"][aria-label="${ariaLabel}"]`);
	if (group) return { kind: "segmented" as const, element: group };
	const dropdown = root.querySelector<HTMLElement>(`[data-dropdown="${ariaLabel}"]`);
	if (dropdown) return { kind: "dropdown" as const, element: dropdown };
	throw new Error(`No choice control labelled "${ariaLabel}"`);
}

export async function chooseOption(root: ParentNode, ariaLabel: string, choice: Choice) {
	const control = findChoiceControl(root, ariaLabel);
	await act(async () => {
		if (control.kind === "select") {
			const select = control.element as HTMLSelectElement;
			select.value = choice.value;
			select.dispatchEvent(new Event("change", { bubbles: true }));
			return;
		}
		const buttons = [...control.element.querySelectorAll<HTMLButtonElement>("button")];
		const target =
			control.kind === "segmented"
				? buttons.find((button) => button.dataset.value === choice.value)
				: buttons.find((button) => button.textContent === choice.label);
		if (!target) throw new Error(`No option "${choice.label}" in "${ariaLabel}"`);
		target.click();
	});
}

export function readChoice(root: ParentNode, ariaLabel: string): string | undefined {
	const control = findChoiceControl(root, ariaLabel);
	if (control.kind === "select") return (control.element as HTMLSelectElement).value;
	if (control.kind === "segmented")
		return control.element.querySelector<HTMLElement>('[aria-checked="true"]')?.dataset.value;
	return control.element.querySelector<HTMLElement>('[aria-current="true"]')?.textContent ?? undefined;
}

export function countChoiceControls(root: ParentNode): number {
	return root.querySelectorAll('select, [role="radiogroup"], [data-dropdown]').length;
}
