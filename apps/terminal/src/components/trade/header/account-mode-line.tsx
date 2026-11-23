import { RobotIcon } from "@phosphor-icons/react";
import { useAutoTraderStatus } from "@/lib/auto-trader/hooks";
import { autoTraderPhase, isTrading, PHASE_SHORT_LABEL } from "@/lib/auto-trader/phase";
import { getNetwork } from "@/lib/network";

interface Props {
	address: `0x${string}`;
}

export function AccountModeLine({ address }: Props) {
	const status = useAutoTraderStatus(address, getNetwork() === "mainnet");
	const phase = autoTraderPhase(status.data);
	if (phase === "setup") return <span className="text-xs text-fg-muted">Manual</span>;
	return (
		<span className="flex items-center gap-1 text-xs text-fg-muted">
			<RobotIcon className="size-3" />
			{isTrading(phase) ? "Auto Trader on" : `Auto Trader ${PHASE_SHORT_LABEL[phase].toLowerCase()}`}
		</span>
	);
}
