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

const action =
	"h-6 rounded-4 px-1.5 text-xs font-medium text-fg-secondary transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-stroke-focus disabled:pointer-events-none disabled:text-fg-disabled";

export function PositionRowActions({ disabled, closing, lockedCoin, onLimit, onMarket, onReverse }: Props) {
	if (lockedCoin)
		return (
			<div className="inline-flex items-center justify-end gap-1">
				{[t`Limit`, t`Market`, t`Reverse`].map((label) => (
					<AutoLockedClose
						key={label}
						label={label}
						coin={lockedCoin}
						trigger={
							<button
								type="button"
								className="inline-flex items-center gap-1 h-6 rounded-4 px-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
							/>
						}
					/>
				))}
			</div>
		);
	return (
		<div className="inline-flex items-center justify-end gap-1">
			<button type="button" className={action} onClick={onLimit} disabled={disabled}>
				{t`Limit`}
			</button>
			<button type="button" className={action} onClick={onMarket} disabled={disabled}>
				{closing ? t`Closing...` : t`Market`}
			</button>
			<button type="button" className={action} onClick={onReverse} disabled={disabled}>
				{t`Reverse`}
			</button>
		</div>
	);
}
