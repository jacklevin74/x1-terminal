import { SegmentedControlItem, SegmentedControls } from "@hypeterminal/ui";
import type { Side } from "@/lib/trade/types";

interface SideLabels {
	buy: string;
	sell: string;
	buyAria: string;
	sellAria: string;
}

interface Props {
	side: Side;
	onSideChange: (side: Side) => void;
	labels: SideLabels;
}

export function SideToggle({ side, onSideChange, labels }: Props) {
	function handleValueChange(value: string) {
		if (value === "buy" || value === "sell") onSideChange(value);
	}

	return (
		<SegmentedControls value={side} onValueChange={handleValueChange} fullWidth tone={side === "buy" ? "up" : "down"}>
			<SegmentedControlItem value="buy" aria-label={labels.buyAria}>
				{labels.buy}
			</SegmentedControlItem>
			<SegmentedControlItem value="sell" aria-label={labels.sellAria}>
				{labels.sell}
			</SegmentedControlItem>
		</SegmentedControls>
	);
}
