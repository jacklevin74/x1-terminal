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

const FONT_CSS = `@font-face{font-family:"LP Geist";src:url("/dev-refs/logo-prompt/fonts/Geist-Variable.woff2");font-weight:100 900;font-display:block}@font-face{font-family:"LP Aeonik";src:url("/dev-refs/logo-prompt/fonts/AeonikPro-Regular.otf");font-weight:400;font-display:block}@font-face{font-family:"LP Aeonik";src:url("/dev-refs/logo-prompt/fonts/AeonikPro-Bold.otf");font-weight:700;font-display:block}@font-face{font-family:"LP Satoshi";src:url("/dev-refs/logo-prompt/fonts/Satoshi-Variable.ttf");font-weight:300 900;font-display:block}@font-face{font-family:"LP Clash";src:url("/dev-refs/logo-prompt/fonts/ClashGrotesk-Variable.ttf");font-weight:200 700;font-display:block}`;

type IconType = ComponentType<{ size?: number }>;

const variants: { Icon: IconType; title: string; note: string; hasX1: boolean }[] = [
	{
		Icon: V1.Icon,
		title: "Small prompt in the corner",
		note: "Small prompt at the top left of the X1 tile, as in the macOS Terminal icon.",
		hasX1: false,
	},
	{ Icon: V2.Icon, title: "Large centred prompt", note: "Thick round prompt that fills the X1 tile.", hasX1: false },
	{ Icon: V3.Icon, title: "Outlined window", note: "A window drawn as an outline, with no tile fill.", hasX1: false },
	{
		Icon: V4.Icon,
		title: "Bare prompt, cut like the X",
		note: "No tile. The chevron has the flat-cut ends of the X in the X1 mark. The cursor is a gradient block.",
		hasX1: false,
	},
	{
		Icon: V5.Icon,
		title: "Window with a title bar",
		note: "X1 tile with a title bar and three dots above the prompt.",
		hasX1: false,
	},
	{
		Icon: V6.Icon,
		title: "Folded two-tone chevron",
		note: "The chevron is two arms in two tones, as in the Windows Terminal icon.",
		hasX1: false,
	},
	{
		Icon: V7.Icon,
		title: "X-cut chevron with the gradient cursor",
		note: "The chevron is one half of the X from the X1 mark. The cursor takes the gradient of the 1.",
		hasX1: false,
	},
	{
		Icon: V8.Icon,
		title: "Gradient tile",
		note: "The tile carries the X1 gradient. The prompt is white.",
		hasX1: false,
	},
	{
		Icon: V9.Icon,
		title: "Prompt inside the X1 mark",
		note: "The X1 mark stays. The left half of the X is lit as the chevron and the 1 reads as the cursor.",
		hasX1: true,
	},
	{ Icon: V10.Icon, title: "Block cursor", note: "Sharp chevron with a tall gradient block cursor.", hasX1: false },
];

const faces = [
	{ name: "Geist", family: '"LP Geist", sans-serif', size: 15.5, bold: 700, regular: 400, tracking: "-0.01em" },
	{ name: "Aeonik Pro", family: '"LP Aeonik", sans-serif', size: 16, bold: 700, regular: 400, tracking: "-0.01em" },
	{ name: "Satoshi", family: '"LP Satoshi", sans-serif', size: 16.5, bold: 800, regular: 500, tracking: "-0.015em" },
	{ name: "Clash Grotesk", family: '"LP Clash", sans-serif', size: 16.5, bold: 600, regular: 400, tracking: "0" },
];

type Face = (typeof faces)[number];

function Lockup({ Icon, face, hasX1, scale = 1 }: { Icon: IconType; face: Face; hasX1: boolean; scale?: number }) {
	return (
		<span
			role="img"
			aria-label="X1 Terminal"
			className="inline-flex shrink-0 items-center whitespace-nowrap text-fg select-none"
			style={{ gap: 9 * scale }}
		>
			<Icon size={26 * scale} />
			<span
				data-part="word"
				aria-hidden="true"
				className="leading-none"
				style={{
					fontFamily: face.family,
					fontSize: face.size * scale,
					letterSpacing: face.tracking,
					fontWeight: face.regular,
				}}
			>
				{!hasX1 && <span style={{ fontWeight: face.bold }}>X1 </span>}
				<span style={{ fontWeight: hasX1 ? face.bold - 100 : face.regular }}>Terminal</span>
			</span>
		</span>
	);
}

function NavStrip({ children, name }: { children: React.ReactNode; name: string }) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex h-12 w-[380px] items-center gap-6 border-b border-stroke-weak bg-background px-4">
				{children}
				<span className="flex items-center gap-7 text-xs font-medium">
					<span className="text-fg">Trade</span>
					<span className="text-fg-muted">Tournament</span>
				</span>
			</div>
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{name}</span>
		</div>
	);
}

export function LogoPromptGallery() {
	return (
		<div className="min-h-screen bg-background p-6 text-fg">
			<style>{FONT_CSS}</style>
			<div className="mx-auto flex max-w-[1380px] flex-col gap-1">
				<h1 className="mb-3 text-base font-semibold">
					X1 Terminal logo, 10 prompt icons in X1 style with real typefaces
				</h1>
				<section data-variant="Current" className="flex items-center gap-6 rounded-8 bg-surface p-4">
					<span className="w-20 text-lg font-semibold">Current</span>
					<NavStrip name="X1 tile with Terminal in Geist 600">
						<X1TerminalLogo />
					</NavStrip>
				</section>
				{variants.map((v, i) => (
					<section key={v.title} data-variant={`#${i + 1}`} className="flex flex-col gap-3 rounded-8 bg-surface p-4">
						<div className="flex items-baseline gap-3">
							<span className="text-lg font-semibold text-fg">#{i + 1}</span>
							<span className="text-sm text-fg">{v.title}</span>
							<span className="text-xs text-fg-muted">{v.note}</span>
						</div>
						<div className="flex flex-wrap items-center gap-6">
							<div data-big className="flex size-[132px] shrink-0 items-center justify-center rounded-8 bg-background">
								<v.Icon size={96} />
							</div>
							<div className="flex h-[132px] w-[400px] shrink-0 items-center justify-center rounded-8 bg-background">
								<Lockup Icon={v.Icon} face={faces[0]} hasX1={v.hasX1} scale={2.4} />
							</div>
							<div className="grid grid-cols-2 gap-x-4 gap-y-2">
								{faces.map((face) => (
									<NavStrip key={face.name} name={face.name}>
										<Lockup Icon={v.Icon} face={face} hasX1={v.hasX1} />
									</NavStrip>
								))}
							</div>
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
