import { Checkbox } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { FieldLabel } from "@/components/ui/field-label";
import { NumberInput } from "@/components/ui/number-input";
import { TWAP_MINUTES_MAX, TWAP_MINUTES_MIN } from "@/config/trade";
import { useOrderEntryActions, useTwapMinutes, useTwapRandomize } from "@/stores/use-order-entry-store";

interface Props {
	disabled: boolean;
}

const HOURS_MAX = Math.floor(TWAP_MINUTES_MAX / 60);
const MINUTES_PER_INPUT_MAX = 59;

function displayValue(n: number): string {
	return n > 0 ? String(n) : "";
}

function clamp(n: number, min: number, max: number): number {
	if (Number.isNaN(n)) return min;
	return Math.min(Math.max(n, min), max);
}

export function TradeFormTwap({ disabled }: Props) {
	const twapMinutesNum = useTwapMinutes();
	const twapRandomize = useTwapRandomize();
	const { setTwapMinutes, setTwapRandomize } = useOrderEntryActions();

	const hours = Math.floor(twapMinutesNum / 60);
	const minutes = twapMinutesNum - hours * 60;

	function handleHoursChange(value: string) {
		const h = clamp(Math.floor(Number(value) || 0), 0, HOURS_MAX);
		const cappedMinutes = h >= HOURS_MAX ? 0 : minutes;
		setTwapMinutes(clamp(h * 60 + cappedMinutes, 0, TWAP_MINUTES_MAX));
	}

	function handleMinutesChange(value: string) {
		const m = clamp(Math.floor(Number(value) || 0), 0, MINUTES_PER_INPUT_MAX);
		const cappedHours = hours >= HOURS_MAX ? HOURS_MAX : hours;
		const total = cappedHours >= HOURS_MAX ? HOURS_MAX * 60 : cappedHours * 60 + m;
		setTwapMinutes(clamp(total, 0, TWAP_MINUTES_MAX));
	}

	return (
		<div className="flex min-w-0 flex-col gap-3">
			<div className="flex flex-col gap-2">
				<FieldLabel>{t`Running Time (${TWAP_MINUTES_MIN}m - ${TWAP_MINUTES_MAX / 60}h)`}</FieldLabel>
				<div className="grid grid-cols-2 gap-2">
					<NumberInput
						placeholder={t`Hour(s)`}
						value={displayValue(hours)}
						onChange={(e) => handleHoursChange(e.target.value)}
						allowDecimals={false}
						min={0}
						max={HOURS_MAX}
						suffix={t`H`}
						disabled={disabled}
					/>
					<NumberInput
						placeholder={t`Minute(s)`}
						value={displayValue(minutes)}
						onChange={(e) => handleMinutesChange(e.target.value)}
						allowDecimals={false}
						min={0}
						max={MINUTES_PER_INPUT_MAX}
						suffix={t`M`}
						disabled={disabled || hours >= HOURS_MAX}
						readOnly={hours >= HOURS_MAX}
					/>
				</div>
			</div>
			<div className="flex min-h-6 items-center">
				<Checkbox
					checked={twapRandomize}
					onCheckedChange={(checked) => setTwapRandomize(checked === true)}
					disabled={disabled}
					label={t`Randomize timing`}
				/>
			</div>
		</div>
	);
}
