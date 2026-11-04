import type { Position } from "@/lib/hyperliquid";
import type { Markets } from "@/lib/hyperliquid/markets";
import type { TpSlOrderInfo } from "@/lib/trade/open-orders";
import type { Side } from "@/lib/trade/types";
import type { ClosePositionData, LimitClosePositionData, TpSlPositionData } from "./position-dialog-types";

export interface PositionRowProps {
	position: Position;
	markets: Markets;
	markPx: string | undefined;
	tpSlInfo: TpSlOrderInfo | undefined;
	isRowClosing: boolean;
	onClose: (data: ClosePositionData) => void;
	onLimitClose: (data: LimitClosePositionData) => void;
	onReverse: (data: ClosePositionData) => void;
	onOpenTpSl: (data: TpSlPositionData) => void;
	onSelectMarket: (coin: string, side: Side) => void;
}

export interface PositionHeading {
	label: string;
	numeric: boolean;
	sort?: boolean;
	sortBy?: (p: Position) => number;
	className?: string;
}
