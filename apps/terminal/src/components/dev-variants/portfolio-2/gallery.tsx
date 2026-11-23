import type { ComponentType } from "react";
import { APP_HEADER_OFFSET_CLASS, APP_HEADER_PLUS_BANNER_OFFSET_CLASS } from "@/config/layout";
import { cn } from "@/lib/cn";
import { useIsTestnet } from "@/stores/use-global-settings-store";
import { TopNav } from "../../trade/header/top-nav";
import { MobileHeader } from "../../trade/mobile/mobile-header";
import { TestnetBanner } from "../../trade/testnet-banner";
import type { TabId } from "../portfolio/data";
import type { VariantProps } from "./common";
import { V1Desktop, V1Mobile } from "./v1";
import { V2Desktop, V2Mobile } from "./v2";
import { V3Desktop, V3Mobile } from "./v3";
import { V4Desktop, V4Mobile } from "./v4";
import { V5Desktop, V5Mobile } from "./v5";

const variants: { D: ComponentType<VariantProps>; M: ComponentType<VariantProps>; title: string }[] = [
	{ D: V1Desktop, M: V1Mobile, title: "#2 header over the stat list and the trader card in columns" },
	{ D: V2Desktop, M: V2Mobile, title: "#2 header over a cell strip of the stats and the four trader cells" },
	{ D: V3Desktop, M: V3Mobile, title: "#2 header over the 2x2 trader cards and a 7-stat strip" },
	{ D: V4Desktop, M: V4Mobile, title: "#2 header with the stats folded into the summary ledger, tabs only under it" },
	{ D: V5Desktop, M: V5Mobile, title: "#2 header over the dense terminal stat table and 32px tab rows" },
];

export interface FrameSearch {
	frame?: "desktop" | "mobile";
	v?: number;
	tab?: TabId;
}

export function Portfolio2Frame({ frame, v = 1, tab }: FrameSearch) {
	const isTestnet = useIsTestnet();
	const { D, M } = variants[Math.min(Math.max(v, 1), variants.length) - 1];
	if (frame === "mobile")
		return (
			<div className="dark min-h-dvh w-full bg-background font-sans text-fg">
				<MobileHeader />
				<M tab={tab} />
			</div>
		);
	return (
		<div
			className={cn(
				"dark min-h-dvh w-full bg-background font-sans text-fg",
				isTestnet ? APP_HEADER_PLUS_BANNER_OFFSET_CLASS : APP_HEADER_OFFSET_CLASS,
			)}
		>
			<TestnetBanner />
			<TopNav />
			<D tab={tab} />
		</div>
	);
}

interface StageProps {
	kind: "desktop" | "mobile";
	label: string;
	src: string;
}

function Stage({ kind, label, src }: StageProps) {
	const w = kind === "desktop" ? 1512 : 390;
	const h = kind === "desktop" ? 1500 : 2400;
	const scale = kind === "desktop" ? 0.62 : 0.62;
	return (
		<div className="flex flex-col gap-2">
			<span className="flex items-center gap-3 text-2xs tracking-micro text-fg-muted uppercase">
				{label}
				<a href={src} target="_blank" rel="noreferrer" className="tracking-normal normal-case underline">
					Open full size
				</a>
			</span>
			<div
				className={kind === "desktop" ? "overflow-hidden rounded-8" : "overflow-hidden rounded-16"}
				style={{ width: w * scale, height: h * scale }}
			>
				<iframe
					title={label}
					src={src}
					width={w}
					height={h}
					loading="lazy"
					className="origin-top-left bg-background"
					style={{ transform: `scale(${scale})` }}
				/>
			</div>
		</div>
	);
}

export function Portfolio2Gallery() {
	return (
		<main className="dark min-h-screen bg-background text-fg">
			<header className="flex max-w-4xl flex-col gap-1 px-10 pt-10 text-xs text-fg-muted">
				<span>
					Portfolio page on a saved snapshot of the demo account 0x5fa3...9627 (Hyperliquid info API, 2026-11-22). Every
					number comes from the snapshot. Fees and win rate use the last 300 fills in the snapshot.
				</span>
			</header>
			{variants.map(({ title }, i) => {
				const base = `/dev/variants/portfolio-2?v=${i + 1}`;
				return (
					<section key={title} className="flex flex-col gap-6 px-10 py-10">
						<div className="flex items-center gap-3 text-xs">
							<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
							<span>{title}</span>
						</div>
						<div className="flex flex-wrap items-start gap-8">
							<Stage kind="desktop" label="Desktop" src={`${base}&frame=desktop`} />
							<Stage kind="mobile" label="Mobile" src={`${base}&frame=mobile`} />
						</div>
					</section>
				);
			})}
		</main>
	);
}
