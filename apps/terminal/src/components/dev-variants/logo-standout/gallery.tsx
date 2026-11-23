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

const REFS = "/dev-refs/logo-standout";

const FONT_CSS = `@font-face{font-family:"LS Instrument Serif";src:url("/dev-refs/logo-standout/fonts/InstrumentSerif-Italic.ttf");font-weight:400;font-style:italic;font-display:block}@font-face{font-family:"LS Inter Tight";src:url("/dev-refs/logo-standout/fonts/InterTight.ttf");font-weight:100 900;font-style:normal;font-display:block}@font-face{font-family:"LS Toxigenesis";src:url("/dev-refs/logo-standout/fonts/Toxigenesis.otf");font-weight:700;font-style:normal;font-display:block}@font-face{font-family:"LS Sora";src:url("/dev-refs/logo-standout/fonts/Sora-Variable.ttf");font-weight:100 800;font-style:normal;font-display:block}@font-face{font-family:"LS Geist";src:url("/dev-refs/logo-standout/fonts/Geist-Variable.woff2");font-weight:100 900;font-style:normal;font-display:block}@font-face{font-family:"LS Clash Grotesk";src:url("/dev-refs/logo-standout/fonts/ClashGrotesk-Bold.otf");font-weight:700;font-style:normal;font-display:block}@font-face{font-family:"LS Satoshi";src:url("/dev-refs/logo-standout/fonts/Satoshi-Variable.ttf");font-weight:300 900;font-style:normal;font-display:block}@font-face{font-family:"LS Nunito";src:url("/dev-refs/logo-standout/fonts/Nunito.ttf");font-weight:200 1000;font-style:normal;font-display:block}@font-face{font-family:"LS Zilla Slab";src:url("/dev-refs/logo-standout/fonts/ZillaSlab-Medium.ttf");font-weight:500;font-style:normal;font-display:block}`;

const variants: { Logo: ComponentType; title: string; source: string; file: string }[] = [
	{ Logo: V1.Logo, title: "Italic serif word beside the plain mark", source: "Hyperliquid", file: "hyperliquid" },
	{ Logo: V2.Logo, title: "Heavy tight grotesk", source: "Bloomberg", file: "bloomberg" },
	{ Logo: V3.Logo, title: "Wide squared caps at mark height, in the X1 brand font", source: "Solana", file: "solana" },
	{ Logo: V4.Logo, title: "Coloured lowercase word with a small endorsement", source: "Kraken", file: "kraken" },
	{ Logo: V5.Logo, title: "Light, larger word set close to the mark", source: "Lighter", file: "lighter" },
	{ Logo: V6.Logo, title: "Heavy caps with one accent letter", source: "Bybit", file: "bybit" },
	{ Logo: V7.Logo, title: "Thin geometric caps", source: "GMX", file: "gmx" },
	{ Logo: V8.Logo, title: "Heavy tight lowercase", source: "Stripe", file: "stripe" },
	{ Logo: V9.Logo, title: "Rounded lowercase", source: "Warp", file: "warp" },
	{ Logo: V10.Logo, title: "Slab serif word beside a square tile", source: "Zed", file: "zed" },
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

function Row({
	label,
	title,
	file,
	source,
	Logo,
}: {
	label: string;
	title: string;
	file?: string;
	source?: string;
	Logo: ComponentType;
}) {
	return (
		<section data-variant={label} className="flex flex-col gap-3 rounded-8 bg-surface p-4">
			<div className="flex items-baseline gap-3">
				<span className="text-lg font-semibold text-fg">{label}</span>
				<span className="text-sm text-fg-secondary">{title}</span>
			</div>
			<div className="flex flex-wrap items-center gap-6">
				<NavStrip Logo={Logo} />
				<div
					data-zoom
					className="flex h-[120px] w-[520px] items-center justify-center overflow-hidden rounded-8 bg-background"
				>
					<div style={{ transform: "scale(3)" }}>
						<Logo />
					</div>
				</div>
				{file && (
					<div className="flex flex-col gap-1">
						<span className="text-2xs tracking-micro text-fg-muted uppercase">Reference: {source}</span>
						<img
							src={`${REFS}/${file}.png`}
							alt={`${source} logo`}
							className="h-[88px] w-[336px] rounded-8 object-cover object-left"
						/>
					</div>
				)}
			</div>
		</section>
	);
}

export function LogoStandoutGallery() {
	return (
		<div className="min-h-screen bg-background p-6 text-fg">
			<style>{FONT_CSS}</style>
			<div className="mx-auto flex max-w-[1400px] flex-col gap-1">
				<h1 className="mb-3 text-base font-semibold">X1 Terminal logo, 10 concepts from real wordmarks</h1>
				<Row label="Current" title="X1 tile with Terminal in Geist 600" Logo={X1TerminalLogo} />
				{variants.map((v, i) => (
					<Row key={v.file} label={`#${i + 1}`} title={v.title} file={v.file} source={v.source} Logo={v.Logo} />
				))}
			</div>
		</div>
	);
}
