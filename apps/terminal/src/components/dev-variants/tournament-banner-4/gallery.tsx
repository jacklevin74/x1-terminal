import type { ReactNode } from "react";
import { pad, prizeFor, tiers, usdc, useTimeLeft } from "@/components/tournament/data";
import { TraderRow } from "@/components/tournament/trader-row";
import { cn } from "@/lib/cn";

const BG = "color-mix(in oklch, var(--color-x1-blue) 32%, var(--color-background))";
const INK = "color-mix(in oklch, var(--color-x1-cyan) 40%, var(--color-x1-blue))";
const PLACE = ["1st place", "2nd place", "3rd place"];

function Dots({
	cols,
	rows,
	grow,
	size = 20,
	min = 0.6,
	max = 5.6,
}: {
	cols: number;
	rows: number;
	grow: "x" | "y" | "none" | "corner";
	size?: number;
	min?: number;
	max?: number;
}) {
	const dots = [];
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			let t = 0.5;
			if (grow === "x") t = x / (cols - 1);
			if (grow === "y") t = y / (rows - 1);
			if (grow === "corner") t = Math.max(0, 1 - Math.hypot((cols - 1 - x) / cols, y / rows) * 1.6);
			dots.push(
				<circle
					key={`${x}-${y}`}
					cx={x * size + size / 2}
					cy={y * size + size / 2}
					r={min + t * (max - min)}
					fill={INK}
				/>,
			);
		}
	}
	return (
		<svg
			className="absolute inset-0 size-full"
			viewBox={`0 0 ${cols * size} ${rows * size}`}
			preserveAspectRatio="xMaxYMid slice"
			aria-hidden="true"
		>
			{dots}
		</svg>
	);
}

function Mask({ className, mask, children }: { className: string; mask?: string; children: ReactNode }) {
	return (
		<div
			aria-hidden="true"
			className={cn("pointer-events-none absolute -z-10", className)}
			style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
		>
			{children}
		</div>
	);
}

function Clock({ className }: { className?: string }) {
	const t = useTimeLeft();
	return (
		<span
			className={cn(
				"flex items-baseline gap-1 text-xl leading-none font-semibold tracking-tight tabular-nums",
				className,
			)}
		>
			{t.d}
			<span className="text-sm font-medium text-fg-muted">d</span>
			<span className="ml-1.5">{pad(t.h)}</span>
			<span className="text-sm font-medium text-fg-muted">h</span>
			<span className="ml-1.5">{pad(t.m)}</span>
			<span className="text-sm font-medium text-fg-muted">m</span>
			<span className="ml-1.5">{pad(t.s)}</span>
			<span className="text-sm font-medium text-fg-muted">s</span>
		</span>
	);
}

function Pot({ pot, sub }: { pot: number; sub?: ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm text-fg-muted">Round 1 prize pool</span>
			<span className="flex items-baseline gap-2 text-3xl leading-none font-semibold tracking-tight tabular-nums">
				{usdc(pot)}
				<span className="text-base font-medium tracking-normal text-fg-muted">USDC</span>
			</span>
			{sub}
		</div>
	);
}

interface Variant {
	n: string;
	name: string;
	banner: (pot: number) => ReactNode;
}

const VARIANTS: Variant[] = [
	{
		n: "#1",
		name: "Middle band (now)",
		banner: (pot) => (
			<>
				<Mask
					className="inset-y-0 right-[22%] w-[50%]"
					mask="linear-gradient(90deg, transparent, black 40%, black 70%, transparent)"
				>
					<Dots cols={40} rows={9} grow="x" />
				</Mask>
				<Pot pot={pot} />
				<Clock />
			</>
		),
	},
	{
		n: "#2",
		name: "Dots at the right edge, clock under the pot",
		banner: (pot) => (
			<>
				<Mask className="inset-y-0 right-0 w-[58%]" mask="linear-gradient(90deg, transparent, black 45%)">
					<Dots cols={40} rows={9} grow="x" />
				</Mask>
				<Pot pot={pot} sub={<Clock className="mt-1 text-base text-fg-secondary" />} />
			</>
		),
	},
	{
		n: "#3",
		name: "Uniform fine dots across the whole banner",
		banner: (pot) => (
			<>
				<Mask className="inset-0">
					<Dots cols={72} rows={9} grow="none" size={20} min={1.4} max={1.4} />
				</Mask>
				<Pot pot={pot} />
				<Clock />
			</>
		),
	},
	{
		n: "#4",
		name: "Cluster in the top-right corner, clock below it",
		banner: (pot) => (
			<>
				<Mask className="top-0 right-0 h-[70%] w-[34%]" mask="linear-gradient(180deg, black 50%, transparent)">
					<Dots cols={24} rows={7} grow="corner" size={18} min={0.4} max={5} />
				</Mask>
				<Pot pot={pot} />
				<Clock className="self-end" />
			</>
		),
	},
	{
		n: "#5",
		name: "Thin halftone strip along the bottom edge",
		banner: (pot) => (
			<>
				<Mask className="inset-x-0 bottom-0 h-[26px]" mask="linear-gradient(90deg, transparent, black 25%)">
					<Dots cols={110} rows={1} grow="x" size={13} min={0.5} max={4} />
				</Mask>
				<Pot pot={pot} />
				<Clock />
			</>
		),
	},
	{
		n: "#6",
		name: "Dots fill the right half, clock in a solid pill on top",
		banner: (pot) => (
			<>
				<Mask className="inset-y-0 right-0 w-[62%]" mask="linear-gradient(90deg, transparent, black 35%)">
					<Dots cols={40} rows={9} grow="x" />
				</Mask>
				<Pot pot={pot} />
				<span className="rounded-full bg-background px-5 py-3">
					<Clock />
				</span>
			</>
		),
	},
	{
		n: "#7",
		name: "Dots rise from the bottom, biggest at the base",
		banner: (pot) => (
			<>
				<Mask className="inset-y-0 right-0 w-[70%]" mask="linear-gradient(90deg, transparent, black 30%)">
					<Dots cols={50} rows={9} grow="y" size={18} min={0.3} max={4.5} />
				</Mask>
				<Pot pot={pot} />
				<Clock />
			</>
		),
	},
];

export function TournamentBanner4Gallery() {
	const tier = tiers.high;
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[1440px] flex-col gap-10">
				{VARIANTS.map((v) => (
					<section key={v.n} className="flex flex-col gap-3">
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{v.n}</span>
							<span className="text-fg">{v.name}</span>
						</div>
						<div className="flex flex-col overflow-hidden rounded-16 bg-surface">
							<div
								className="relative isolate flex items-center justify-between overflow-hidden px-8 py-7 text-fg"
								style={{ backgroundColor: BG }}
							>
								{v.banner(tier.pot)}
							</div>
							<div className="grid grid-cols-3 gap-px bg-background">
								{tier.traders.slice(0, 3).map((r) => (
									<div key={r.address} className="flex flex-col gap-5 bg-surface p-6">
										<div className="flex flex-col gap-1">
											<span className="text-sm text-fg-muted">{PLACE[r.rank - 1]}</span>
											<span className="flex items-baseline gap-1.5 text-2xl leading-none font-semibold tracking-tight tabular-nums">
												{usdc(prizeFor(tier, r.rank))}
												<span className="text-sm font-medium tracking-normal text-fg-muted">USDC</span>
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
