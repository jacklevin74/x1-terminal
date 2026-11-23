import { prizeFor, tiers, usd } from "@/components/tournament/data";
import { Halftone } from "@/components/tournament/halftone";
import { TraderRow } from "@/components/tournament/trader-row";

interface Tone {
	n: string;
	name: string;
	bg: string;
	fg: string;
	muted: string;
	ink: string;
}

const BLUE = "var(--color-x1-blue)";
const CYAN = "var(--color-x1-cyan)";
const FG = "var(--color-fg)";
const MUTED = "var(--color-fg-muted)";

const TONES: Tone[] = [
	{
		n: "#1",
		name: "Deep X1 blue tint on the surface, blue dots",
		bg: `color-mix(in oklch, ${BLUE} 18%, var(--color-surface))`,
		fg: FG,
		muted: MUTED,
		ink: `color-mix(in oklch, ${BLUE} 55%, var(--color-surface))`,
	},
	{
		n: "#2",
		name: "Navy, 32% blue toward the page, cyan dots",
		bg: `color-mix(in oklch, ${BLUE} 32%, var(--color-background))`,
		fg: FG,
		muted: MUTED,
		ink: `color-mix(in oklch, ${CYAN} 40%, ${BLUE})`,
	},
	{
		n: "#3",
		name: "Solid X1 blue, white text, light dots",
		bg: BLUE,
		fg: "var(--color-white)",
		muted: "color-mix(in oklch, var(--color-white) 72%, transparent)",
		ink: `color-mix(in oklch, var(--color-white) 28%, ${BLUE})`,
	},
	{
		n: "#4",
		name: "The logo gradient, cyan to blue",
		bg: `linear-gradient(135deg, ${CYAN}, ${BLUE})`,
		fg: "var(--color-white)",
		muted: "color-mix(in oklch, var(--color-white) 78%, transparent)",
		ink: "color-mix(in oklch, var(--color-white) 30%, transparent)",
	},
	{
		n: "#5",
		name: "Neutral dark grey, the blue lives only in the dots",
		bg: "var(--color-control-hover)",
		fg: FG,
		muted: MUTED,
		ink: `color-mix(in oklch, ${BLUE} 70%, var(--color-control-hover))`,
	},
	{
		n: "#6",
		name: "White, blue dots",
		bg: "var(--color-inverse-surface)",
		fg: "var(--color-fg-inverse)",
		muted: "var(--color-fg-inverse-muted)",
		ink: `color-mix(in oklch, ${BLUE} 35%, var(--color-inverse-surface))`,
	},
	{
		n: "#7",
		name: "Cyan tint on the surface, cyan dots",
		bg: `color-mix(in oklch, ${CYAN} 12%, var(--color-surface))`,
		fg: FG,
		muted: MUTED,
		ink: `color-mix(in oklch, ${CYAN} 45%, var(--color-surface))`,
	},
	{
		n: "#8",
		name: "Blue to surface fade, left to right",
		bg: `linear-gradient(90deg, color-mix(in oklch, ${BLUE} 40%, var(--color-surface)), var(--color-surface) 70%)`,
		fg: FG,
		muted: MUTED,
		ink: `color-mix(in oklch, ${BLUE} 45%, var(--color-surface))`,
	},
];

const PLACE = ["1st place", "2nd place", "3rd place"];

export function TournamentBanner3Gallery() {
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
								style={{ background: t.bg, color: t.fg }}
							>
								<Halftone ink={t.ink} />
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
