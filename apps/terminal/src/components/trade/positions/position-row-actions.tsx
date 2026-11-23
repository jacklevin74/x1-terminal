import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { AutoLockedClose } from "@/components/trade/auto/auto-locked-close";

interface Props {
	disabled: boolean;
	closing: boolean;
	lockedCoin?: string | null;
	onLimit: () => void;
	onMarket: () => void;
	onReverse: () => void;
}

export function PositionRowActions({ disabled, closing, lockedCoin, onLimit, onMarket, onReverse }: Props) {
	if (lockedCoin)
		return (
			<div className="inline-flex items-center justify-end gap-1.5">
				{[t`Limit`, t`Market`, t`Reverse`].map((label) => (
					<AutoLockedClose key={label} label={label} coin={lockedCoin} />
				))}
			</div>
		);
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
