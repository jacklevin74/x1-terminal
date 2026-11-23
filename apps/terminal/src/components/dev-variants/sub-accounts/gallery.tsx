import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants = [
	{ C: V1, title: "Wallet menu with an Accounts section" },
	{ C: V2, title: "Accounts page with a card per account" },
	{ C: V3, title: "Account switcher in the header" },
	{ C: V4, title: "Transfer sheet with a two-account picker" },
	{ C: V5, title: "Auto setup step: run this bot in a new sub-account" },
];

export function SubAccountsGallery() {
	return (
		<main className="dark bg-background text-fg">
			{variants.map(({ C, title }, i) => (
				<section key={title} className="relative h-screen border-b border-stroke-weak">
					<div className="absolute inset-x-0 top-0 z-50 flex h-10 items-center gap-3 bg-surface px-4 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span className="text-fg">{title}</span>
						<span className="ml-auto text-fg-muted">
							Example balances and sub-account names. Trader names from the Hyperliquid leaderboard (2026-11-18).
						</span>
					</div>
					<C />
				</section>
			))}
		</main>
	);
}
