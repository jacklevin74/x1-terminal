import { Header as V1 } from "./v1";
import { Header as V2 } from "./v2";
import { Header as V3 } from "./v3";
import { Header as V4 } from "./v4";
import { Header as V5 } from "./v5";
import { Header as V6 } from "./v6";

const VARIANTS = [
	{
		n: "#1",
		name: "Balance is the title, account chip as the eyebrow, series as tabs in the chart card",
		src: "Coinbase, Robinhood",
		C: V1,
	},
	{
		n: "#2",
		name: "Identity row: identicon, Portfolio, address and total on one line, switches in the card",
		src: "Hyperdash trader page",
		C: V2,
	},
	{ n: "#3", name: "Title and actions only, value and text toggles inside the chart card", src: "Hyperliquid", C: V3 },
	{
		n: "#4",
		name: "Page tabs with the account chip at the end, actions in the summary card",
		src: "Binance wallet overview",
		C: V4,
	},
	{
		n: "#5",
		name: "X1 band: account, value and actions on the navy band, chart under it",
		src: "The tournament overview card",
		C: V5,
	},
	{
		n: "#6",
		name: "No title: account chip and icon actions on one row, value inside the card",
		src: "Phantom, Rabby",
		C: V6,
	},
];

export function PortfolioHeaderGallery() {
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[1376px] flex-col gap-14">
				{VARIANTS.map((v) => (
					<section key={v.n} className="flex flex-col gap-4">
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{v.n}</span>
							<span className="text-fg">{v.name}</span>
							<span className="text-fg-muted">{v.src}</span>
						</div>
						<v.C />
					</section>
				))}
			</div>
		</div>
	);
}
