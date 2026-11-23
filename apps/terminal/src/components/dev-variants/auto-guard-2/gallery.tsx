import type { ComponentType, ReactNode } from "react";
import { AutoLockedClose } from "@/components/trade/auto/auto-locked-close";
import { AutoStartWarning } from "@/components/trade/auto/auto-start-warning";
import type { Position } from "@/lib/hyperliquid";
import { account, coinLabel, type Props, positions, type Scene } from "./data";
import V1 from "./v1";
import V2 from "./v2";
import V3 from "./v3";
import V4 from "./v4";
import V5 from "./v5";

const variants: { C: ComponentType<Props>; title: string }[] = [
	{ C: V1, title: "Warning list with two buttons; locked close opens a popover under the button" },
	{ C: V2, title: "Two choice cards with an inline sub-account form; locked close shows a toast with Pause" },
	{ C: V3, title: "Compact warning with position chips; locked close opens a small modal" },
	{ C: V4, title: "Positions table in the warning; locked close expands the row" },
	{ C: V5, title: "Segmented choice in the warning; locked close has a hover tooltip and a click popover" },
];

export function AutoGuard2Gallery() {
	const params = new URLSearchParams(window.location.search);
	if (params.get("frame") === "shipped") return <Shipped />;
	if (params.get("frame") === "mobile") {
		const v = variants[Number(params.get("v") ?? 1) - 1] ?? variants[0];
		const scene = (params.get("scene") ?? "start") as Scene;
		return (
			<main className="dark min-h-screen bg-background text-fg">
				<v.C scene={scene} mobile />
			</main>
		);
	}

	return (
		<main className="dark min-h-screen bg-background text-fg">
			<p className="px-10 pt-8 text-xs text-fg-muted">
				Example account: real positions of pool trader {account.usr.slice(0, 6)}…{account.usr.slice(-4)} (
				{positions.map((p) => coinLabel(p.coin)).join(", ")}), from round 1. No keep or close prediction per position.
				The mobile frames load this route at 390 × 844, where the shared AdaptiveModal renders as a bottom sheet.
			</p>
			{variants.map(({ C, title }, i) => (
				<section key={title} className="flex flex-col gap-8 px-10 py-10">
					<div className="flex items-center gap-3 text-xs">
						<span className="rounded-full bg-fill px-2.5 py-0.5 font-semibold text-fg-inverse">#{i + 1}</span>
						<span>{title}</span>
					</div>
					<div className="flex flex-wrap items-start gap-10">
						<Frame label="Start with open positions">
							<C scene="start" />
						</Frame>
						<Frame label="Mobile 390">
							<Phone v={i + 1} scene="start" />
						</Frame>
					</div>
					<div className="flex flex-wrap items-start gap-10">
						<Frame label="Create a sub-account">
							<C scene="sub" />
						</Frame>
						<Frame label="Mobile 390">
							<Phone v={i + 1} scene="sub" />
						</Frame>
					</div>
					<Frame label="Auto Trader on: close buttons locked (click one)">
						<C scene="close" />
					</Frame>
				</section>
			))}
		</main>
	);
}

function Phone({ v, scene }: { v: number; scene: Scene }) {
	return (
		<iframe
			title={`Variant ${v} ${scene} mobile`}
			src={`/dev/variants/auto-guard-2?frame=mobile&v=${v}&scene=${scene}`}
			loading="lazy"
			className="h-[844px] w-[390px] flex-none rounded-16 bg-background"
		/>
	);
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			{children}
		</div>
	);
}

function Shipped() {
	const real = positions.map(
		(p) =>
			({
				coin: p.coin,
				szi: String(p.szi),
				positionValue: String(p.ntl),
				unrealizedPnl: String(p.upnl),
				leverage: { type: p.lev.split(" ")[1], value: Number.parseInt(p.lev, 10) },
			}) as unknown as Position,
	);
	return (
		<main className="dark flex min-h-screen flex-col items-end gap-3 bg-background p-10 text-fg">
			<span className="inline-flex items-center gap-1.5">
				{["Limit", "Market", "Reverse"].map((label) => (
					<AutoLockedClose key={label} label={label} coin="HYPE" />
				))}
			</span>
			<AutoStartWarning open={!params().has("closed")} positions={real} onCancel={() => {}} onConfirm={() => {}} />
		</main>
	);
}

function params() {
	return new URLSearchParams(window.location.search);
}
