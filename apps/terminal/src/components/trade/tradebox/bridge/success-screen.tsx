import { Button } from "@hypeterminal/ui";
import { Trans } from "@lingui/react/macro";
import { CaretDownIcon, CheckCircleIcon, WalletIcon } from "@phosphor-icons/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { LIFI_EXPLORER_URL } from "@/config/bridge";
import { formatTokenAmount, processTypeLabel } from "@/lib/bridge/format";
import { formatDateTimeShort, shortenAddress } from "@/lib/format";
import type { ProcessDetail } from "@/lib/lifi/use-bridge";
import { disclosureTriggerClass, ExplorerLink, HyperCoreUsdcIcon, StatusBadgeIcon } from "./shared-ui";

interface Props {
	address: string;
	receivedAmount: string;
	txHash: string | null;
	startTime: number | null;
	endTime: number | null;
	processDetails: ProcessDetail[];
	onDone: () => void;
	onNewDeposit: () => void;
}

export function SuccessScreen({
	address,
	receivedAmount,
	txHash,
	startTime,
	endTime,
	processDetails,
	onDone,
	onNewDeposit,
}: Props) {
	const formatted = formatTokenAmount(receivedAmount, 6);
	const totalSeconds = startTime && endTime ? Math.round((endTime - startTime) / 1000) : null;

	return (
		<div className="flex flex-1 flex-col gap-4">
			<div className="flex flex-col items-center gap-3 pt-6 pb-2">
				<StatusBadgeIcon>
					<CheckCircleIcon className="size-6 text-market-up" weight="fill" />
				</StatusBadgeIcon>
				<div className="space-y-1 text-center">
					<p className="text-base font-medium text-fg">
						<Trans>Deposit successful</Trans>
					</p>
					<p className="text-xs text-fg-muted">
						<Trans>Your funds were successfully deposited.</Trans>
					</p>
				</div>
			</div>

			<InfoRowGroup>
				<InfoRow
					label={<Trans>Fill status</Trans>}
					value={
						<span className="font-medium text-market-up">
							<Trans>Successful</Trans>
						</span>
					}
				/>
				{totalSeconds !== null ? (
					<InfoRow label={<Trans>Total time</Trans>} value={<Trans>{totalSeconds} seconds</Trans>} />
				) : null}
			</InfoRowGroup>

			<InfoRowGroup className="border-t border-stroke-faint pt-3">
				<InfoRow
					label={<Trans>Source</Trans>}
					value={
						txHash ? (
							<ExplorerLink href={`${LIFI_EXPLORER_URL}/${txHash}`}>
								<WalletIcon className="size-3" />
								{shortenAddress(address)}
							</ExplorerLink>
						) : (
							<span className="flex items-center gap-1.5">
								<WalletIcon className="size-3" />
								{shortenAddress(address)}
							</span>
						)
					}
				/>
				<InfoRow label={<Trans>Destination</Trans>} value="Hyperliquid" />
			</InfoRowGroup>

			<InfoRowGroup className="border-t border-stroke-faint pt-3">
				<InfoRow
					label={<Trans>You receive</Trans>}
					value={
						<span className="flex items-center gap-1.5">
							<HyperCoreUsdcIcon size="sm" />
							{formatted} USDC
						</span>
					}
				/>
			</InfoRowGroup>

			{processDetails.length > 0 ? (
				<Collapsible>
					<CollapsibleTrigger className={disclosureTriggerClass}>
						<Trans>More details</Trans>
						<CaretDownIcon className="size-3 transition-transform group-data-panel-open:rotate-180 motion-reduce:transition-none" />
					</CollapsibleTrigger>
					<CollapsibleContent>
						<InfoRowGroup className="px-2">
							{processDetails.map((detail) => (
								<InfoRow
									key={detail.txHash}
									label={processTypeLabel(detail.type)}
									value={
										<ExplorerLink href={detail.txLink || `${LIFI_EXPLORER_URL}/${detail.txHash}`}>
											{shortenAddress(detail.txHash)}
										</ExplorerLink>
									}
								/>
							))}
							{processDetails[0]?.startedAt ? (
								<InfoRow
									label={<Trans>Order submitted</Trans>}
									value={formatDateTimeShort(processDetails[0].startedAt)}
								/>
							) : null}
							{(() => {
								const lastDetail = processDetails.at(-1);
								if (!lastDetail?.doneAt) return null;
								return <InfoRow label={<Trans>Order filled</Trans>} value={formatDateTimeShort(lastDetail.doneAt)} />;
							})()}
						</InfoRowGroup>
					</CollapsibleContent>
				</Collapsible>
			) : null}

			<div className="mt-auto flex w-full gap-2">
				<Button variant="secondary" intent="neutral" size="md" className="flex-1" onClick={onDone}>
					<Trans>Close</Trans>
				</Button>
				<Button variant="filled" intent="neutral" size="md" className="flex-1" onClick={onNewDeposit}>
					<Trans>New deposit</Trans>
				</Button>
			</div>
		</div>
	);
}
