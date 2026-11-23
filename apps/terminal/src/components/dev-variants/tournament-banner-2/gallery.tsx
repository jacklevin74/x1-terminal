import { prizeFor, tiers, usd } from "@/components/tournament/data";
import { Halftone } from "@/components/tournament/halftone";
import { TraderRow } from "@/components/tournament/trader-row";

interface Tone {
	n: string;
	name: string;
	bg: string;
	fg: string;
	muted: string;
}

const TONES: Tone[] = [
	{
		n: "#1",
		name: "Pure white (now)",
		bg: "var(--color-inverse-surface)",
		fg: "var(--color-fg-inverse)",
		muted: "var(--color-fg-inverse-muted)",
	},
	{
		n: "#2",
		name: "Off white, 8% toward the page",
		bg: "color-mix(in oklch, var(--color-inverse-surface) 92%, var(--color-background))",
		fg: "var(--color-fg-inverse)",
		muted: "var(--color-fg-inverse-muted)",
	},
	{
		n: "#3",
		name: "Light grey, 16% toward the page",
		bg: "color-mix(in oklch, var(--color-inverse-surface) 84%, var(--color-background))",
		fg: "var(--color-fg-inverse)",
		muted: "var(--color-fg-inverse-muted)",
	},
	{
		n: "#4",
		name: "Silver, 28% toward the page",
		bg: "color-mix(in oklch, var(--color-inverse-surface) 72%, var(--color-background))",
		fg: "var(--color-fg-inverse)",
		muted: "var(--color-fg-inverse-muted)",
	},
	{
		n: "#5",
		name: "Warm paper, white mixed with the green",
		bg: "color-mix(in oklch, var(--color-inverse-surface) 90%, var(--color-market-up))",
		fg: "var(--color-fg-inverse)",
		muted: "var(--color-fg-inverse-muted)",
	},
	{
		n: "#6",
		name: "Dark grey, control-hover",
		bg: "var(--color-control-hover)",
		fg: "var(--color-fg)",
		muted: "var(--color-fg-muted)",
	},
	{
		n: "#7",
		name: "Dark green tint",
		bg: "color-mix(in oklch, var(--color-market-up) 16%, var(--color-surface))",
		fg: "var(--color-fg)",
		muted: "var(--color-fg-muted)",
	},
];

const PLACE = ["1st place", "2nd place", "3rd place"];

export function TournamentBanner2Gallery() {
	const tier = tiers.high;
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[1440px] flex-col gap-10">
				{TONES.map((t) => (
					<section key={t.n} className="flex flex-col gap-3">
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{t.n}</span>
							<span className="text-fg">{t.name}</span>
						</div>
						<div className="flex flex-col overflow-hidden rounded-16 bg-surface">
							<div
								className="relative isolate flex items-center justify-between overflow-hidden px-8 py-7"
								style={{ backgroundColor: t.bg, color: t.fg }}
							>
								<Halftone ink={`color-mix(in oklch, ${t.fg} 16%, ${t.bg})`} />
								<div className="flex flex-col gap-2">
									<span className="text-sm" style={{ color: t.muted }}>
										Round 1 prize pool
									</span>
									<span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">
										{usd(tier.pot)}
									</span>
								</div>
							</div>
							<div className="grid grid-cols-3 gap-px bg-background">
								{tier.traders.slice(0, 3).map((r) => (
									<div key={r.address} className="flex flex-col gap-5 bg-surface p-6">
										<div className="flex flex-col gap-1">
											<span className="text-sm text-fg-muted">{PLACE[r.rank - 1]}</span>
											<span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
												{usd(prizeFor(tier, r.rank))}
											</span>
										</div>
										<TraderRow r={r} />
									</div>
								))}
							</div>
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
