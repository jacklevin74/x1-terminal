import { Button } from "@hypeterminal/ui";
import { Trans } from "@lingui/react/macro";
import { CaretDownIcon, ClockIcon, SpinnerGapIcon, WalletIcon, WarningCircleIcon } from "@phosphor-icons/react";
import Big from "big.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { formatSendAmount, formatTokenAmount } from "@/lib/bridge/format";
import { formatDuration, formatUSD, shortenAddress } from "@/lib/format";
import type { BridgeToken } from "@/lib/lifi/use-balances";
import { type BridgeQuote, useBridgeQuote } from "@/lib/lifi/use-quote";
import { BackButton, disclosureTriggerClass, HyperCoreUsdcIcon, QuoteCountdown, TokenIcon } from "./shared-ui";

interface Props {
	token: BridgeToken;
	tokenAmount: string;
	address: string;
	onBack: () => void;
	onConfirm: (quote: BridgeQuote) => void;
}

export function ConfirmationScreen({ token, tokenAmount, address, onBack, onConfirm }: Props) {
	const quoteParams = {
		fromChainId: token.chainId,
		fromTokenAddress: token.address,
		fromTokenDecimals: token.decimals,
		fromAddress: address,
		amount: tokenAmount,
	};

	const { data: quote, isLoading: quoteLoading, isError: quoteError, dataUpdatedAt } = useBridgeQuote(quoteParams);

	const usdDisplay = (() => {
		try {
			return formatUSD(Big(tokenAmount).times(token.priceUSD).toNumber(), 2);
		} catch {
			return "$0.00";
		}
	})();

	const receiveAmount = quote ? formatTokenAmount(quote.toAmount, 6) : "---";
	const receiveAmountUSD = quote ? formatUSD(quote.toAmountUSD, 2) : "";

	return (
		<div className="flex flex-1 flex-col gap-3">
			<div>
				<div className="flex items-center justify-between">
					<BackButton onClick={onBack} />
					{quote ? <QuoteCountdown dataUpdatedAt={dataUpdatedAt} /> : null}
				</div>

				<p className="py-3 text-center text-base font-medium text-fg tabular-nums">{usdDisplay}</p>

				<InfoRowGroup>
					<InfoRow
						label={<Trans>Source</Trans>}
						value={
							<span className="flex items-center gap-1.5">
								<WalletIcon className="size-3" />
								<Trans>Wallet ({shortenAddress(address)})</Trans>
							</span>
						}
					/>
					<InfoRow label={<Trans>Destination</Trans>} value="Hyperliquid" />
					<InfoRow
						label={
							<span className="flex items-center gap-1">
								<ClockIcon className="size-3" />
								<Trans>Estimated time</Trans>
							</span>
						}
						value={quote ? `~${formatDuration(Math.ceil(quote.executionDuration / 60))}` : "---"}
					/>
				</InfoRowGroup>

				<InfoRowGroup className="mt-3 border-t border-stroke-faint pt-3">
					<InfoRow
						label={<Trans>You send</Trans>}
						value={
							<span className="flex items-center gap-1.5">
								<TokenIcon token={token} size="sm" />
								{formatSendAmount(tokenAmount)} {token.symbol}
							</span>
						}
					/>
					<InfoRow
						label={<Trans>You receive</Trans>}
						value={
							<span className="flex items-center gap-1.5">
								<HyperCoreUsdcIcon size="sm" />
								{receiveAmount} USDC
								{receiveAmountUSD ? <span className="ml-1 text-fg-muted">{receiveAmountUSD}</span> : null}
							</span>
						}
					/>
				</InfoRowGroup>
			</div>

			{quote ? (
				<Collapsible>
					<CollapsibleTrigger className={disclosureTriggerClass}>
						<span>
							<Trans>Transaction breakdown</Trans> ({formatUSD(quote.totalFeesUSD, 2)})
						</span>
						<CaretDownIcon className="size-3 transition-transform group-data-panel-open:rotate-180 motion-reduce:transition-none" />
					</CollapsibleTrigger>
					<CollapsibleContent>
						<InfoRowGroup className="px-2">
							{quote.gasCosts.map((gas) => (
								<InfoRow
									key={`gas-${gas.token.symbol}-${gas.amount}`}
									label={<Trans>Gas ({gas.token.symbol})</Trans>}
									value={formatUSD(gas.amountUSD, 2)}
								/>
							))}
							{quote.feeCosts.map((fee) => (
								<InfoRow key={`fee-${fee.name}-${fee.amount}`} label={fee.name} value={formatUSD(fee.amountUSD, 2)} />
							))}
						</InfoRowGroup>
					</CollapsibleContent>
				</Collapsible>
			) : null}

			{quoteError ? (
				<div className="flex items-center gap-2 rounded-8 bg-control p-3">
					<WarningCircleIcon className="size-4 shrink-0 text-market-down" />
					<span className="text-xs text-market-down">
						<Trans>No route available. Try a different amount or asset.</Trans>
					</span>
				</div>
			) : null}

			<Button
				variant="filled"
				intent="neutral"
				size="md"
				className="mt-auto w-full"
				disabled={!quote || quoteLoading}
				onClick={() => quote && onConfirm(quote)}
			>
				{quoteLoading ? (
					<>
						<SpinnerGapIcon className="size-4 animate-spin" />
						<Trans>Preparing your quote...</Trans>
					</>
				) : (
					<Trans>Confirm</Trans>
				)}
			</Button>
		</div>
	);
}
