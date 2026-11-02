import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon } from "@phosphor-icons/react";
import Big from "big.js";
import { useState } from "react";
import { NumberInput } from "@/components/ui/number-input";
import { PERCENT_OPTIONS } from "@/config/bridge";
import { isValidUsdInput, usdToTokenAmount } from "@/lib/bridge/format";
import type { BridgeToken } from "@/lib/lifi/use-balances";
import { BackButton, HyperCoreUsdcIcon, TokenIcon } from "./shared-ui";

interface Props {
	token: BridgeToken;
	initialUsd: string;
	onBack: () => void;
	onContinue: (tokenAmount: string, usdInput: string) => void;
}

export function AmountEntryScreen({ token, initialUsd, onBack, onContinue }: Props) {
	const [usdInput, setUsdInput] = useState(initialUsd);

	function handleUsdChange(e: React.ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value;
		if (raw === "") {
			setUsdInput("");
			return;
		}
		if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
		setUsdInput(raw);
	}

	function handlePercent(percent: number) {
		const usd = Big(token.amountUSD).times(percent).div(100).toFixed(2);
		setUsdInput(usd);
	}

	function handleMax() {
		setUsdInput(Big(token.amountUSD).toFixed(2));
	}

	const canContinue = isValidUsdInput(usdInput) && Big(usdInput).lte(token.amountUSD);

	function handleSubmit() {
		if (!canContinue) return;
		const tokenAmount = usdToTokenAmount(usdInput, token.priceUSD, token.decimals);
		if (tokenAmount) onContinue(tokenAmount, usdInput);
	}

	const chips = PERCENT_OPTIONS.map((p) => ({ label: <Trans>{p}%</Trans>, onClick: () => handlePercent(p) }));

	return (
		<div className="flex flex-1 flex-col gap-4">
			<BackButton onClick={onBack} />

			<NumberInput
				inlineLabel={t`Amount`}
				suffix="USD"
				value={usdInput}
				onChange={handleUsdChange}
				maxAllowedDecimals={2}
				placeholder="0.00"
				chips={chips}
				maxLabel={<Trans>Max</Trans>}
				onMaxClick={handleMax}
			/>

			<div className="flex items-center justify-center gap-3 rounded-8 bg-control p-3">
				<div className="flex items-center gap-2">
					<TokenIcon token={token} />
					<div className="text-left">
						<p className="text-xs text-fg-muted">
							<Trans>You send</Trans>
						</p>
						<p className="text-xs font-medium text-fg">{token.symbol}</p>
					</div>
				</div>
				<ArrowRightIcon className="size-4 shrink-0 text-fg-muted" />
				<div className="flex items-center gap-2">
					<HyperCoreUsdcIcon />
					<div className="text-left">
						<p className="text-xs text-fg-muted">
							<Trans>You receive</Trans>
						</p>
						<p className="text-xs font-medium text-fg">USDC</p>
					</div>
				</div>
			</div>

			<Button
				variant="filled"
				intent="neutral"
				size="md"
				className="mt-auto w-full"
				disabled={!canContinue}
				onClick={handleSubmit}
			>
				<Trans>Continue</Trans>
			</Button>
		</div>
	);
}
