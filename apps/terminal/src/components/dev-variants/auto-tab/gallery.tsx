import type { ComponentType } from "react";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType; title: string }[] = [
	{ C: V1, title: "One status line, plan and orders as sub tabs" },
	{ C: V2, title: "Status sidebar, tables on the right" },
	{ C: V3, title: "Position bars: now vs target per market" },
	{ C: V4, title: "Plan / Orders / Health switch" },
	{ C: V5, title: "Plan cards with status tiles" },
];

const TABS = [
	"Balances 2",
	"Positions 1",
	"Open Orders 0",
	"TWAP 0",
	"Trade History",
	"Funding History",
	"Order History",
	"Auto Trader",
];

export function AutoTabGallery() {
	return (
		<main className="dark min-h-screen bg-background p-6 text-fg">
			<div className="mx-auto flex max-w-[1180px] flex-col gap-10">
				{variants.map(({ C, title }, i) => (
					<section key={title} className="flex flex-col gap-2">
						<div className="flex items-center gap-3 text-xs">
							<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
							<span>{title}</span>
						</div>
						<div className="h-[420px] overflow-hidden rounded-8 bg-surface">
							<div className="flex h-9 items-stretch gap-5 border-b border-stroke-weak px-3 text-xs">
								{TABS.map((t) => (
									<span
										key={t}
										className={
											t === "Auto Trader"
												? "flex items-center border-b-2 border-fg text-fg"
												: "flex items-center text-fg-muted"
										}
									>
										{t}
									</span>
								))}
							</div>
							<div className="h-[384px] overflow-auto">
								<C />
							</div>
						</div>
					</section>
				))}
			</div>
		</main>
	);
}
