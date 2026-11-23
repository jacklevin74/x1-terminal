import type { ComponentType } from "react";
import X1TerminalLogo from "@/components/trade/header/x1-terminal-logo";
import * as V1 from "./v1";
import * as V2 from "./v2";
import * as V3 from "./v3";
import * as V4 from "./v4";
import * as V5 from "./v5";
import * as V6 from "./v6";
import * as V7 from "./v7";
import * as V8 from "./v8";
import * as V9 from "./v9";
import * as V10 from "./v10";

const variants: { Logo: ComponentType; title: string; note: string }[] = [
	{
		Logo: V1.Logo,
		title: "Mark weight, clipped corners",
		note: "Same stem as the X1 mark. Corners are cut at an angle, like the flag of the 1.",
	},
	{
		Logo: V2.Logo,
		title: "Extended, flat-cut points",
		note: "Wide letters. The points of A, M and N are cut flat, like the ends of the X.",
	},
	{
		Logo: V3.Logo,
		title: "Open E and A",
		note: "E is three bars and A has no crossbar, so the word reads as cut shapes.",
	},
	{
		Logo: V4.Logo,
		title: "The 1 from the mark as the I",
		note: "The I is the exact 1 from the X1 mark, with its gradient.",
	},
	{ Logo: V5.Logo, title: "Stencil", note: "Bars are separated from stems by a gap of fixed width." },
	{ Logo: V6.Logo, title: "Slanted", note: "Mark weight with clipped corners, slanted 14 degrees." },
	{ Logo: V7.Logo, title: "Rounded single line", note: "One line weight with round ends and round corners." },
	{ Logo: V8.Logo, title: "Hairline, wide", note: "Thin line, wide letters and open spacing, beside the heavy mark." },
	{ Logo: V9.Logo, title: "Condensed, tall", note: "Narrow letters at the full height of the tile." },
	{ Logo: V10.Logo, title: "Double line", note: "Each stroke of the mark weight is split into two thin lines." },
];

function NavStrip({ Logo }: { Logo: ComponentType }) {
	return (
		<div className="flex h-12 w-[420px] items-center gap-6 border-b border-stroke-weak bg-background px-4">
			<Logo />
			<span className="flex items-center gap-7 text-xs font-medium">
				<span className="text-fg">Trade</span>
				<span className="text-fg-muted">Tournament</span>
			</span>
		</div>
	);
}

function Row({ label, title, note, Logo }: { label: string; title: string; note: string; Logo: ComponentType }) {
	return (
		<section data-variant={label} className="flex flex-col gap-3 rounded-8 bg-surface p-4">
			<div className="flex items-baseline gap-3">
				<span className="text-lg font-semibold text-fg">{label}</span>
				<span className="text-sm text-fg">{title}</span>
				<span className="text-xs text-fg-muted">{note}</span>
			</div>
			<div className="flex flex-wrap items-center gap-6">
				<NavStrip Logo={Logo} />
				<div
					data-zoom
					className="flex h-[150px] w-[760px] items-center justify-center overflow-hidden rounded-8 bg-background"
				>
					<div style={{ transform: "scale(4)" }}>
						<Logo />
					</div>
				</div>
			</div>
		</section>
	);
}

export function LogoDrawnGallery() {
	return (
		<div className="min-h-screen bg-background p-6 text-fg">
			<div className="mx-auto flex max-w-[1280px] flex-col gap-1">
				<h1 className="mb-3 text-base font-semibold">X1 Terminal logo, 10 drawn letterings built on the X1 mark</h1>
				<Row label="Current" title="X1 tile with Terminal in Geist 600" note="" Logo={X1TerminalLogo} />
				{variants.map((v, i) => (
					<Row key={v.title} label={`#${i + 1}`} title={v.title} note={v.note} Logo={v.Logo} />
				))}
			</div>
		</div>
	);
}
