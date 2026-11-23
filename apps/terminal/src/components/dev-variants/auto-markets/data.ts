export const ALL_MARKETS = [
	"BTC",
	"ETH",
	"SOL",
	"HYPE",
	"ZEC",
	"NEAR",
	"XRP",
	"xyz:GOOGL",
	"xyz:SOXL",
	"xyz:NVDA",
	"xyz:BRENTOIL",
	"xyz:GOLD",
	"xyz:MU",
	"xyz:INTC",
	"xyz:XYZ100",
	"xyz:SKHX",
	"xyz:SNDK",
	"xyz:AAPL",
];

export interface MarketsProps {
	selected: string[];
	onToggle: (coin: string) => void;
	onOpenEditor: () => void;
}

export function shortName(coin: string) {
	return coin.split(":").at(-1) ?? coin;
}
