import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { sameMarket } from "@/lib/auto-trader/phase";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";
import { useUserPositions } from "@/lib/hyperliquid";

interface Props {
	open: boolean;
	settings: AutoTraderSettings;
	markets: readonly string[];
	onCancel: () => void;
	onConfirm: () => void;
}

function positionWarning(coins: string[]) {
	const names = coins.map((coin) => coin.split(":").at(-1) ?? coin);
	if (names.length === 1)
		return `You have an open ${names[0]} position. Auto Trader will likely close or rebalance it.`;
	const list = names.length > 3 ? `${names.length} markets` : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
	return `You have open positions in ${list}. Auto Trader will likely close or rebalance them.`;
}

export function AutoStartModal({ open, settings, markets, onCancel, onConfirm }: Props) {
	const { positions } = useUserPositions();
	const affected = positions.map((p) => p.coin).filter((coin) => markets.some((market) => sameMarket(market, coin)));
	return (
		<Modal open={open} onOpenChange={(next) => !next && onCancel()}>
			<ModalPopup size="sm">
				<ModalHeader>
					<ModalTitle>Start Auto Trader?</ModalTitle>
				</ModalHeader>
				<ModalContent className="flex flex-col gap-4">
					<p className="text-sm text-fg-secondary">
						Auto Trader trades this account about every 5 minutes with your saved settings: {settings.leverage}x
						leverage, {Number((settings.killPct * 100).toFixed(2))}% daily loss stop and ${settings.minOrderUsd} minimum
						order.
					</p>
					<p className="text-sm text-fg-secondary">
						It resizes positions in its {markets.length} markets, including positions you open by hand. Trading can lose
						money.
					</p>
					{affected.length > 0 && (
						<p role="alert" className="text-sm text-warning">
							{positionWarning(affected)}
						</p>
					)}
					<div className="grid grid-cols-2 gap-2">
						<Button variant="secondary" intent="neutral" size="md" onClick={onCancel}>
							Cancel
						</Button>
						<Button variant="filled" intent="brand" size="md" onClick={onConfirm}>
							Start
						</Button>
					</div>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}
