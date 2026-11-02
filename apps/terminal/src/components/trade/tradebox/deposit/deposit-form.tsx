import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowLineDownIcon, ClockIcon, SpinnerGapIcon, WalletIcon } from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { NumberInput } from "@/components/ui/number-input";
import { MIN_DEPOSIT_USDC, USDC_DECIMALS } from "@/config/contracts";
import { NETWORKS } from "@/config/networks";
import { inlineLinkButtonClass, NetworkSelect } from "./shared-ui";

const ARBITRUM_NETWORK = NETWORKS[0];

interface Props {
	amount: string;
	onAmountChange: (value: string) => void;
	balance: string;
	validation: { valid: boolean; error: string | null };
	isPending: boolean;
	onSubmit: () => void;
}

export function DepositForm({ amount, onAmountChange, balance, validation, isPending, onSubmit }: Props) {
	return (
		<div className="flex flex-1 flex-col gap-3">
			<NetworkSelect label={<Trans>From</Trans>} value="arbitrum" onChange={() => {}} disabled />

			<div className="flex flex-col gap-1">
				<div className="flex min-h-6 items-center justify-between text-xs">
					<span className="text-fg-muted">
						<Trans>Available</Trans>
					</span>
					<Button
						variant="link"
						intent="neutral"
						size="xs"
						className={inlineLinkButtonClass}
						onClick={() => onAmountChange(balance)}
					>
						{balance} USDC
					</Button>
				</div>
				<NumberInput
					inlineLabel={t`Amount`}
					suffix="USDC"
					maxLabel={t`Max`}
					onMaxClick={() => onAmountChange(balance)}
					placeholder="0.00"
					value={amount}
					onChange={(e) => onAmountChange(e.target.value)}
					invalid={!!validation.error}
					error={validation.error || undefined}
				/>
			</div>

			<InfoRowGroup>
				<InfoRow
					label={
						<span className="flex items-center gap-1">
							<WalletIcon className="size-3" />
							<Trans>Minimum</Trans>
						</span>
					}
					value={`${formatUnits(MIN_DEPOSIT_USDC, USDC_DECIMALS)} USDC`}
				/>
				<InfoRow
					label={
						<span className="flex items-center gap-1">
							<ClockIcon className="size-3" />
							<Trans>Estimated time</Trans>
						</span>
					}
					value={ARBITRUM_NETWORK.estimatedDepositTime}
				/>
			</InfoRowGroup>

			<Button
				variant="filled"
				intent="neutral"
				size="md"
				onClick={onSubmit}
				disabled={!validation.valid || isPending}
				className="mt-auto w-full"
			>
				{isPending ? (
					<>
						<SpinnerGapIcon className="size-4 animate-spin" />
						<Trans>Processing...</Trans>
					</>
				) : (
					<>
						<ArrowLineDownIcon className="size-4" />
						<Trans>Deposit</Trans>
					</>
				)}
			</Button>
		</div>
	);
}
