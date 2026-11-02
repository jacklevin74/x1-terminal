import { Badge, Button } from "@hypeterminal/ui";
import { Trans } from "@lingui/react/macro";
import { ClockIcon, SpinnerGapIcon, WalletIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { BRIDGE_TIMEOUT_MS, LIFI_EXPLORER_URL } from "@/config/bridge";
import { shortenAddress } from "@/lib/format";
import { ExplorerLink, HyperCoreUsdcIcon, StatusBadgeIcon } from "./shared-ui";

const BRIDGE_MESSAGE_MAX_WIDTH = "max-w-70";

interface Props {
	address: string;
	statusText: string;
	txHash: string | null;
	onDone: () => void;
}

export function ExecutingScreen({ address, statusText, txHash, onDone }: Props) {
	const [isTimedOut, setIsTimedOut] = useState(false);
	const startTimeRef = useRef(Date.now());

	useEffect(() => {
		const timer = setInterval(() => {
			if (Date.now() - startTimeRef.current >= BRIDGE_TIMEOUT_MS) {
				setIsTimedOut(true);
				clearInterval(timer);
			}
		}, 30_000);
		return () => clearInterval(timer);
	}, []);

	if (isTimedOut) {
		return (
			<div className="flex flex-1 flex-col">
				<div className="flex flex-1 flex-col items-center justify-center gap-4">
					<StatusBadgeIcon>
						<ClockIcon className="size-6 text-warning" />
					</StatusBadgeIcon>
					<div className="space-y-1 text-center">
						<p className="text-base font-medium text-fg">
							<Trans>Taking longer than expected</Trans>
						</p>
						<p className={`text-xs text-fg-muted ${BRIDGE_MESSAGE_MAX_WIDTH}`}>
							<Trans>Your bridge is still processing. Funds are safe.</Trans>
						</p>
					</div>
					{txHash ? (
						<ExplorerLink href={`${LIFI_EXPLORER_URL}/${txHash}`}>
							<Trans>Track on LI.FI Explorer</Trans>
						</ExplorerLink>
					) : null}
				</div>
				<Button variant="secondary" intent="neutral" size="md" className="mt-auto w-full" onClick={onDone}>
					<Trans>Close</Trans>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-4">
			<div className="flex flex-1 flex-col items-center justify-center gap-4">
				<StatusBadgeIcon>
					<SpinnerGapIcon className="size-6 animate-spin text-fg-muted" />
				</StatusBadgeIcon>
				<div className="space-y-1 text-center">
					<p className="text-base font-medium text-fg">{statusText}</p>
					<p className="text-xs text-fg-muted">
						{txHash ? (
							<Trans>Your transaction is being processed</Trans>
						) : (
							<Trans>Confirm transaction in your wallet</Trans>
						)}
					</p>
				</div>
			</div>

			{txHash ? (
				<div className="space-y-3">
					<InfoRowGroup>
						<InfoRow
							label={<Trans>Fill status</Trans>}
							value={
								<Badge tone="neutral" size="sm">
									<Trans>Processing</Trans>
								</Badge>
							}
						/>
						<InfoRow
							label={<Trans>Source</Trans>}
							value={
								<ExplorerLink href={`${LIFI_EXPLORER_URL}/${txHash}`}>
									<WalletIcon className="size-3" />
									{shortenAddress(address)}
								</ExplorerLink>
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
									<Trans>USDC</Trans>
								</span>
							}
						/>
					</InfoRowGroup>
				</div>
			) : null}

			<Button variant="secondary" intent="neutral" size="md" className="mt-auto w-full" onClick={onDone}>
				<Trans>Close</Trans>
			</Button>
		</div>
	);
}
