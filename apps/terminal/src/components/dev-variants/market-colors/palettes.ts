// Candidate values for --text-success / --text-error (dark). Hex is the subject of this gallery, not a style leak.
export interface Palette {
	n: string;
	name: string;
	note: string;
	up: string;
	down: string;
}

export const PALETTES: Palette[] = [
	{ n: "Now", name: "Current", note: "#2ee6a6 and #ff5c6c, the neon pair", up: "#2ee6a6", down: "#ff5c6c" },
	{
		n: "#1",
		name: "TradingView classic",
		note: "#26a69a teal green and #ef5350 coral, the default most traders know",
		up: "#26a69a",
		down: "#ef5350",
	},
	{ n: "#2", name: "Binance", note: "#0ecb81 and #f6465d", up: "#0ecb81", down: "#f6465d" },
	{ n: "#3", name: "Bybit", note: "#20b26c and #ef454a, a shade deeper than Binance", up: "#20b26c", down: "#ef454a" },
	{
		n: "#4",
		name: "Hyperdash",
		note: "#2ebd85 and #f6465d, Binance red with a calmer green",
		up: "#2ebd85",
		down: "#f6465d",
	},
	{
		n: "#5",
		name: "Robinhood",
		note: "#00c805 pure green and #ff5000 orange red, high contrast",
		up: "#00c805",
		down: "#ff5000",
	},
	{
		n: "#6",
		name: "Muted terminal",
		note: "#3fb68b and #e5484d, lower chroma, easy for long sessions",
		up: "#3fb68b",
		down: "#e5484d",
	},
	{ n: "#7", name: "Deep", note: "#16a34a and #dc2626, darker and heavier", up: "#16a34a", down: "#dc2626" },
	{
		n: "#8",
		name: "Mint and rose",
		note: "#5eead4 mint and #fb7185 rose, light and soft on dark",
		up: "#5eead4",
		down: "#fb7185",
	},
];
