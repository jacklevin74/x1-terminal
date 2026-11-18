import type { ReactNode } from "react";

// End-user guide (terminal.x1.xyz/guide). Copy: x1-terminal-user-guide.html (18 Nov 2026), verbatim.
// Uses the app's theme tokens, so it follows the visitor's theme (new or Classic). Public: no wallet needed.

export const GUIDE_SECTIONS = [
	{ id: "what-it-is", title: "What X1 Terminal is" },
	{ id: "getting-started", title: "Getting started" },
	{ id: "funding", title: "Funding your account" },
	{ id: "enable-trading", title: "Enable Trading" },
	{ id: "markets", title: "Choosing a market" },
	{ id: "placing-a-trade", title: "Placing a trade" },
	{ id: "reading-the-screen", title: "Reading the screen" },
	{ id: "sub-accounts", title: "Sub-accounts" },
	{ id: "fees", title: "Fees" },
	{ id: "settings", title: "Settings and themes" },
	{ id: "faq", title: "Troubleshooting and FAQ" },
] as const;

const link = "text-brand underline-offset-2 hover:underline";

function Section({ id, children }: { id: (typeof GUIDE_SECTIONS)[number]["id"]; children: ReactNode }) {
	const title = GUIDE_SECTIONS.find((s) => s.id === id)?.title;
	return (
		<section id={id} className="scroll-mt-6 space-y-3 border-t border-stroke-weak pt-6 first:border-t-0 first:pt-0">
			<h2 className="text-lg font-semibold text-fg">{title}</h2>
			{children}
		</section>
	);
}
const P = ({ children }: { children: ReactNode }) => <p className="text-sm leading-relaxed text-fg-muted">{children}</p>;
const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-fg">{children}</strong>;
const UL = ({ children }: { children: ReactNode }) => (
	<ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg-muted marker:text-fg-disabled">{children}</ul>
);
const OL = ({ children }: { children: ReactNode }) => (
	<ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-fg-muted marker:text-fg-disabled">{children}</ol>
);
const Kbd = ({ children }: { children: ReactNode }) => (
	<span className="inline-block rounded border border-stroke-weak bg-fill-weak px-1.5 py-px font-mono text-xs text-fg">{children}</span>
);
const Note = ({ children }: { children: ReactNode }) => (
	<p className="rounded-lg border border-stroke-weak bg-fill-weak px-3 py-2.5 text-sm leading-relaxed text-fg-muted">{children}</p>
);
function Table({ head, rows, numCol }: { head: string[]; rows: ReactNode[][]; numCol?: number }) {
	return (
		<div className="overflow-x-auto rounded-lg border border-stroke-weak">
			<table className="w-full min-w-[480px] border-collapse text-left text-xs">
				<thead className="bg-fill-weak text-fg">
					<tr>
						{head.map((h) => (
							<th key={h} className="px-3 py-2 font-medium">
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="text-fg-muted">
					{rows.map((row, i) => (
						<tr key={i} className="border-t border-stroke-weak align-top">
							{row.map((cell, j) => (
								<td key={j} className={`px-3 py-2 leading-relaxed ${j === numCol ? "font-mono text-fg" : ""}`}>
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function LayoutFigure() {
	const box = "fill-fill-weak stroke-stroke-weak";
	const name = "fill-fg text-[13px] font-semibold";
	const txt = "fill-fg-muted text-[12px]";
	return (
		<figure className="space-y-2">
			<div className="overflow-x-auto rounded-lg border border-stroke-weak bg-surface p-2">
				<svg
					viewBox="0 0 760 452"
					role="img"
					aria-label="Trading screen layout: top bar, sentiment strip, market header, chart, order book, order form and account tables"
					className="h-auto w-full min-w-[560px]"
				>
					<rect className={box} x="8" y="8" width="744" height="40" rx="8" />
					<text className={name} x="24" y="33">Top bar</text>
					<text className={txt} x="150" y="33">Market filters, Deposit, account picker, settings</text>
					<rect className={box} x="8" y="60" width="744" height="32" rx="8" />
					<text className={name} x="24" y="81">Sentiment strip</text>
					<text className={txt} x="150" y="81">Large-trader scores per market, for context</text>
					<rect className={box} x="8" y="104" width="744" height="32" rx="8" />
					<text className={name} x="24" y="125">Market header</text>
					<text className={txt} x="150" y="125">Price, 24h change, oracle price, volume, open interest, funding</text>
					<rect className={box} x="8" y="148" width="408" height="200" rx="8" />
					<text className={name} x="24" y="172">Chart</text>
					<text className={txt} x="24" y="192">Price candles, timeframes from 1 minute to 1 day</text>
					<text className={txt} x="24" y="208">Indicators and drawing tools down the left side</text>
					<rect className={box} x="428" y="148" width="152" height="200" rx="8" />
					<text className={name} x="444" y="172">Order book</text>
					<text className={txt} x="444" y="192">Bids and asks</text>
					<text className={txt} x="444" y="208">Trades tab: recent</text>
					<text className={txt} x="444" y="224">fills on the market</text>
					<rect className="fill-brand-soft stroke-brand" x="592" y="148" width="160" height="288" rx="8" />
					<text className={name} x="608" y="172">Order form</text>
					<text className="fill-fg text-[12px]" x="608" y="192">Long or Short</text>
					<text className="fill-fg text-[12px]" x="608" y="208">Size and leverage</text>
					<text className="fill-fg text-[12px]" x="608" y="224">Reduce Only, TP/SL</text>
					<text className="fill-fg text-[12px]" x="608" y="240">Fees before sending</text>
					<text className="fill-fg text-[12px]" x="608" y="256">Enable Trading here</text>
					<rect className={box} x="8" y="360" width="572" height="76" rx="8" />
					<text className={name} x="24" y="384">Account tables</text>
					<text className={txt} x="24" y="404">Balances, Positions, Open Orders, TWAP</text>
					<text className={txt} x="24" y="420">Trade, Funding and Order History</text>
				</svg>
			</div>
			<figcaption className="text-xs text-fg-muted">Trading screen layout · 7 areas</figcaption>
		</figure>
	);
}

export function GuidePage() {
	return (
		<main className="min-h-dvh bg-background text-fg">
			<div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-8 lg:px-12">
				<a href="/" className="text-xs text-fg-muted hover:text-fg">
					← X1 Terminal
				</a>
				<header className="mt-4 space-y-2 border-b border-stroke-weak pb-5">
					<div className="text-2xs uppercase tracking-wider text-fg-muted">terminal.x1.xyz · Help</div>
					<h1 className="text-2xl font-semibold tracking-tight text-fg">X1 Terminal User Guide</h1>
					<p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
						How to connect, fund your account, and trade crypto, stocks and more on Hyperliquid through X1 Terminal.
					</p>
					<div className="text-xs text-fg-disabled">Updated 18 Nov 2026</div>
				</header>

				<div className="mt-6 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
					<nav aria-label="Sections" className="lg:sticky lg:top-6 lg:self-start">
						<ol className="grid grid-cols-1 gap-0.5 rounded-lg border border-stroke-weak p-2 text-xs sm:grid-cols-2 lg:grid-cols-1 lg:border-0 lg:p-0">
							{GUIDE_SECTIONS.map((s, i) => (
								<li key={s.id}>
									<a href={`#${s.id}`} className="flex gap-2 rounded-md px-2 py-1.5 text-fg-muted hover:bg-fill-hover hover:text-fg">
										<span className="w-4 shrink-0 text-right font-mono text-fg-disabled">{i + 1}</span>
										{s.title}
									</a>
								</li>
							))}
						</ol>
					</nav>

					<div className="max-w-3xl space-y-8 pb-16">
						<Section id="what-it-is">
							<P>
								X1 Terminal at <a className={link} href="https://terminal.x1.xyz">terminal.x1.xyz</a> is a trading screen for
								Hyperliquid, the on-chain exchange. Your funds stay in your own Hyperliquid account, and every order goes straight to
								Hyperliquid. X1 never holds your money or your keys.
							</P>
							<P>You can trade three kinds of market:</P>
							<UL>
								<li>
									<B>Perpetuals (Perp):</B> crypto contracts with leverage, such as BTC, ETH, SOL and HYPE.
								</li>
								<li>
									<B>Spot:</B> buying and selling tokens outright, without leverage.
								</li>
								<li>
									<B>Stocks &amp; More:</B> contracts that track stocks (NVDA, AAPL), gold, oil, currencies and indices, also with leverage.
								</li>
							</UL>
							<P>It's built for people who want a clear screen and a one-time setup, without learning Hyperliquid's own tools first.</P>
						</Section>

						<Section id="getting-started">
							<P>You need a browser wallet, Phantom or Rabby, and nothing else. There's no X1 account to create.</P>
							<OL>
								<li>
									Open <a className={link} href="https://terminal.x1.xyz">terminal.x1.xyz</a> on a desktop browser with your wallet
									extension installed.
								</li>
								<li>
									Click <B>Connect</B> in the top right and choose your wallet.
								</li>
								<li>Approve the connection in the wallet pop-up. This only shares your address; it doesn't move any funds.</li>
								<li>
									Your address appears in the account picker at the top right. You can now look around, but you need funds and a one-time
									setup before you can trade.
								</li>
							</OL>
							<Note>
								<B>Restricted regions:</B> X1 Terminal isn't available in the United States or some other countries. Visitors there see a
								notice instead of the trading screen. If the site can't confirm your location, it stays closed as a precaution; try again
								from a normal connection, without a VPN.
							</Note>
						</Section>

						<Section id="funding">
							<P>
								Your trading balance is USDC held in your Hyperliquid account. Click <B>Deposit</B> at the top of the screen and pick how
								to send funds:
							</P>
							<Table
								head={["You have", "Send it as", "Notes"]}
								rows={[
									["USDC", "USDC on Arbitrum", "The standard route; usually arrives in about a minute"],
									["ETH", "Native ETH", "Converted through Unit and credited to your account"],
									["SOL", "Native SOL", "Converted through Unit and credited to your account"],
								]}
							/>
							<P>
								Follow the steps in the deposit window and approve the transfer in your wallet. Your balance shows as <B>Available</B> in
								the order form once it arrives.
							</P>
							<P>
								To withdraw, open the arrow next to <B>Deposit</B> and choose <B>Withdraw</B>. Funds go back to the wallet you connected
								with. Hyperliquid may charge a small network fee on withdrawals.
							</P>
						</Section>

						<Section id="enable-trading">
							<P>
								Before your first trade, click <B>Enable Trading</B> in the order form. It's a one-time setup on a single screen, with two
								signatures:
							</P>
							<OL>
								<li>
									<B>Approve the builder fee.</B> This lets X1 Terminal add its 0.05% fee to orders you place here. It's capped at that
									rate and applies only to orders sent through X1 Terminal.
								</li>
								<li>
									<B>Approve a trading key.</B> Your browser creates a key that can place and cancel orders for you, so you don't sign every
									trade in your wallet.
								</li>
							</OL>
							<P>Things to know:</P>
							<UL>
								<li>
									<B>The trading key can't withdraw funds.</B> Withdrawals always need your wallet's own signature.
								</li>
								<li>
									<B>The key stays in your browser.</B> It isn't sent to X1.
								</li>
								<li>
									<B>New browser, new key:</B> on another computer, or after clearing your browser data, click Enable Trading again.
								</li>
								<li>
									<B>Already approved?</B> Steps you've done before are skipped.
								</li>
							</UL>
						</Section>

						<Section id="markets">
							<P>The top bar filters markets by kind, and the market picker finds a specific one.</P>
							<UL>
								<li>
									<B>Top bar:</B> <Kbd>All</Kbd> <Kbd>Perp</Kbd> (crypto with leverage), <Kbd>Spot</Kbd> (tokens, no leverage) and{" "}
									<Kbd>Stocks &amp; More</Kbd> (stocks, gold, oil, currencies and indices).
								</li>
								<li>
									<B>Market picker:</B> click the market name above the chart. Type to search (for example <em>nvda</em> or <em>gold</em>),
									use the tabs to narrow the list, and sort by price, 24-hour change, open interest or volume.
								</li>
								<li>
									<B>Favourites:</B> click the star next to a market to pin it to the shortcut row under the top bar, so you can switch
									with one click.
								</li>
							</UL>
							<P>
								Greyed-out items in the top bar, such as Vaults, Portfolio, Staking, Leaderboard and Auto Trader, are coming later.
							</P>
						</Section>

						<Section id="placing-a-trade">
							<P>The order form on the right places every trade. Check the market name at the top of the screen first.</P>
							<OL>
								<li>
									<B>Pick the order type</B> from the menu at the top of the form. <B>Market</B> fills now at the best available price.{" "}
									<B>Limit</B> waits until the price reaches the level you set.
								</li>
								<li>
									<B>
										Choose <span className="text-success">Long</span> or <span className="text-error">Short</span>.
									</B>{" "}
									Long profits if the price rises; Short profits if it falls. On Spot, these are Buy and Sell.
								</li>
								<li>
									<B>Set the size</B>, by typing an amount or dragging the slider to 25%, 50%, 75% or 100% of what you can use.
								</li>
								<li>
									<B>Check leverage</B>, shown above the form (for example <Kbd>Cross · 40x</Kbd>). Click it to change it. Higher leverage
									needs less margin, but a smaller price move can liquidate the position.
								</li>
								<li>
									<B>Optional settings:</B>
									<ul className="mt-1.5 list-disc space-y-1.5 pl-5">
										<li>
											<B>Reduce Only:</B> the order can only shrink an existing position, never open or grow one.
										</li>
										<li>
											<B>TP/SL:</B> sets take-profit and stop-loss prices that close the position automatically.
										</li>
									</ul>
								</li>
								<li>
									<B>Review the summary</B> under the form: liquidation price, order value, margin required, slippage, estimated fee and
									builder fee.
								</li>
								<li>
									<B>Click Long or Short</B> to send the order. It appears under <B>Open Orders</B> if it's waiting, or <B>Positions</B>{" "}
									once it fills.
								</li>
							</OL>
							<P>
								<B>Slippage</B> is the most a market order may move from the current price before it's refused; the default is 2.5%.
								Click the value in the summary to change it.
							</P>
						</Section>

						<Section id="reading-the-screen">
							<P>You place orders on the right and watch the market on the left; your account sits along the bottom.</P>
							<LayoutFigure />
							<UL>
								<li>
									<B>Positions</B> shows each open trade: size, entry and mark price, profit and loss, liquidation price and margin. Click a
									market name to open it.
								</li>
								<li>
									<B>Open Orders</B> lists orders still waiting to fill; cancel them there.
								</li>
								<li>
									<B>The sentiment strip</B> scores each market from −100 (bearish) to +100 (bullish), based on the positions and trades of
									a group of large traders. It's information only, not advice.
								</li>
							</UL>
						</Section>

						<Section id="sub-accounts">
							<P>
								Sub-accounts are separate trading accounts under your main wallet, each with its own balance and positions. Use them to
								keep strategies apart: a loss in one can't use another's margin.
							</P>
							<UL>
								<li>
									<B>Switch accounts</B> with the account picker in the top right. Each row shows the account name and short address; the
									current one has a check mark. Hover a row to copy its address.
								</li>
								<li>
									<B>Create or rename</B> a sub-account under <B>Manage subaccounts</B> at the bottom of the picker.
								</li>
								<li>
									<B>Fund it</B> by moving USDC from your main account on the same page. Transfers between your own accounts are free and
									instant.
								</li>
								<li>
									<B>Switching waits for open actions:</B> you can't switch while an order is being sent, so nothing lands in the wrong
									account.
								</li>
							</UL>
							<P>Every account you trade from needs Enable Trading once, from the order form.</P>
						</Section>

						<Section id="fees">
							<P>
								Each filled order pays Hyperliquid's trading fee plus X1 Terminal's 0.05% builder fee, both on the order's value. The
								order form shows both before you send: <B>Est. Fee</B> is Hyperliquid's, <B>Builder Fee</B> is X1's.
							</P>
							<Table
								head={["Fee", "Rate", "Paid to"]}
								numCol={1}
								rows={[
									[
										"Hyperliquid fee, taker (fills right away: market orders, limits that cross)",
										"about 0.045%, lower at higher volume",
										"Hyperliquid",
									],
									[
										"Hyperliquid fee, maker (rests on the order book until filled)",
										"about 0.015%, down to 0% at higher volume",
										"Hyperliquid",
									],
									["Builder fee", "0.05%", "X1 Terminal"],
								]}
							/>
							<P>
								<B>Example:</B> a $10,000 market order costs about $4.50 to Hyperliquid plus $5.00 to X1, about $9.50 in total. The same
								order as a resting limit costs about $1.50 plus $5.00.
							</P>
							<P>
								Hyperliquid sets its own rates and tiers; the order form shows the rate that applies to your account. Deposits and
								transfers between your own accounts carry no X1 fee.
							</P>
						</Section>

						<Section id="settings">
							<P>X1 Terminal opens in its new look by default. To switch:</P>
							<UL>
								<li>
									Click <B>Classic</B> in the header to use the original HypeTerminal look. Click <B>New theme</B> to switch back.
								</li>
								<li>Your choice is remembered in this browser.</li>
							</UL>
							<P>
								The gear icon in the top right opens settings, such as default slippage and display options. Settings are saved per
								browser. Settings were reset to defaults once on 18 Nov 2026 after a site update; set your preferences again if they
								changed.
							</P>
						</Section>

						<Section id="faq">
							<Table
								head={["Problem or question", "What to do"]}
								rows={[
									[
										"The chart and order book are empty",
										"Pick a market from the shortcut row or the market picker. The site switches to BTC on its own after a few seconds if your last market isn't available.",
									],
									[
										'I see "Not available in your region"',
										"X1 Terminal is closed in the US and some other countries. Turn off any VPN; if you're elsewhere and still blocked, refresh once.",
									],
									[
										"My order was refused for slippage",
										"The price moved more than your slippage limit. Try again, use a limit order, or raise slippage in the order summary.",
									],
									[
										"The order form says Enable Trading again",
										"You're on a new browser or account, or your browser data was cleared. Run Enable Trading again; approvals already done are skipped.",
									],
									["I can't switch accounts", "An order is still being sent. Wait a moment and try again."],
									[
										"I can't find a stock",
										<>
											Check <B>Stocks &amp; More</B> in the top bar, or search the market picker by its ticker, such as <em>nvda</em>.
										</>,
									],
									[
										"Can X1 move my funds?",
										"No. The trading key can only place and cancel orders. Withdrawals need your wallet's signature.",
									],
									["Where are my funds held?", "In your own Hyperliquid account. X1 Terminal is a screen for trading it."],
									[
										"What's the sentiment strip?",
										"Scores from tracked large traders, shown for context. It isn't advice, and X1 Terminal doesn't trade on it for you.",
									],
								]}
							/>
						</Section>
					</div>
				</div>
			</div>
		</main>
	);
}
