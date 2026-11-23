import { Header as V1 } from "./v1";
import { Header as V2 } from "./v2";
import { Header as V3 } from "./v3";
import { Header as V4 } from "./v4";
import { Header as V5 } from "./v5";
import { Header as V6 } from "./v6";

const VARIANTS = [
	{ n: "#1", name: "Robinhood: no cards, value over a bare chart, range as text under it, small actions", C: V1 },
	{ n: "#2", name: "Kraken Pro: summary card with actions, chart card with text series and a range dropdown", C: V2 },
	{ n: "#3", name: "Stripe: three stat tiles are the series switch, range as text under the chart", C: V3 },
	{
		n: "#4",
		name: "Statement: a plain stat row, chart card with sentence dropdowns (Account value for Last 30 days)",
		C: V4,
	},
	{ n: "#5", name: "X1 band with the range as text on the band, series as text in the body", C: V5 },
	{ n: "#6", name: "Two columns, no cards: summary ledger left, chart with text toggles right", C: V6 },
];

export function PortfolioHeader2Gallery() {
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[1376px] flex-col gap-16">
				{VARIANTS.map((v) => (
					<section key={v.n} className="flex flex-col gap-5" data-variant={v.n}>
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{v.n}</span>
							<span className="text-fg">{v.name}</span>
						</div>
						<v.C />
					</section>
				))}
			</div>
		</div>
	);
}
