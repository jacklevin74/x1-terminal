import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";

interface Props {
	disabled: boolean;
	closing: boolean;
	onLimit: () => void;
	onMarket: () => void;
	onReverse: () => void;
}

export function PositionRowActions({ disabled, closing, onLimit, onMarket, onReverse }: Props) {
	return (
		<div className="inline-flex items-center justify-end gap-1">
			<Button variant="secondary" intent="neutral" size="xs" onClick={onLimit} disabled={disabled}>
				{t`Limit`}
			</Button>
			<Button variant="secondary" intent="neutral" size="xs" onClick={onMarket} disabled={disabled}>
				{closing ? t`Closing...` : t`Market`}
			</Button>
			<Button variant="secondary" intent="neutral" size="xs" onClick={onReverse} disabled={disabled}>
				{t`Reverse`}
			</Button>
		</div>
	);
}
