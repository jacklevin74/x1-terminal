import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/cn";
import { formatUSD } from "@/lib/format";
import { isPositive } from "@/lib/trade/numbers";
import { getValueColorClass } from "@/lib/ui/value-color";

interface Props {
	label: string;
	value: string;
	onChange: (value: string) => void;
	percentOptions: readonly number[];
	onPercentClick: (percent: number) => void;
	pnlValue: number | null;
	error?: string | null;
	disabled?: boolean;
	referencePrice: number;
}

export function PriceInputWithPercent({
	label,
	value,
	onChange,
	percentOptions,
	onPercentClick,
	pnlValue,
	error,
	disabled,
	referencePrice,
}: Props) {
	const hasReference = isPositive(referencePrice);

	return (
		<div className="flex min-w-0 flex-col gap-1">
			<NumberInput
				inlineLabel={label}
				placeholder={t`Price`}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				invalid={!!error}
				error={error || undefined}
				disabled={disabled}
			/>
			<div className="flex min-h-5 min-w-0 items-center gap-2">
				{pnlValue !== null && (
					<span className={cn("min-w-0 truncate text-xs tabular-nums", getValueColorClass(pnlValue))}>
						{formatUSD(pnlValue, { signDisplay: "exceptZero" })}
					</span>
				)}
				<div className="ml-auto flex shrink-0 items-center gap-1">
					{percentOptions.map((p) => (
						<Button
							key={p}
							variant="secondary"
							intent="neutral"
							size="xxs"
							onClick={() => onPercentClick(p)}
							disabled={disabled || !hasReference}
							aria-label={t`Set to ${p}%`}
							className="tabular-nums"
						>
							{p}%
						</Button>
					))}
				</div>
			</div>
		</div>
	);
}
