import { useState } from "react";
import { coins, labelOf, moodColor, name, overall, signed, updated } from "./data";

interface Props {
	score: number;
}

const css = `
.mr1-ring{position:relative;width:22px;height:22px;border-radius:999px}
.mr1-ring i{position:absolute;inset:0;border-radius:999px;background:conic-gradient(from 0deg,var(--c),color-mix(in oklch,var(--c) 45%,#fff),var(--c),color-mix(in oklch,var(--c) 60%,#000),var(--c));
 -webkit-mask:radial-gradient(circle,transparent 6.5px,#000 7px);mask:radial-gradient(circle,transparent 6.5px,#000 7px);animation:mr1-spin 9s linear infinite;transition:--c .6s}
.mr1-ring b{position:absolute;inset:3px;border-radius:999px;background:var(--c);filter:blur(7px);opacity:.45}
@keyframes mr1-spin{to{transform:rotate(360deg)}}
.mr1-pop{transform-origin:top right;animation:mr1-in .16s cubic-bezier(.2,.8,.2,1)}
@keyframes mr1-in{from{opacity:0;transform:scale(.97)}}
`;

function Bar({ value, h = 6 }: { value: number; h?: number }) {
	const w = Math.abs(value) / 2;
	return (
		<div className="relative w-full rounded-full bg-control" style={{ height: h }}>
			<div className="absolute top-0 bottom-0 w-px bg-fg-muted" style={{ left: "50%" }} />
			<div
				className="absolute top-0 bottom-0 rounded-full"
				style={{ background: moodColor(value), width: `${w}%`, left: value >= 0 ? "50%" : `${50 - w}%` }}
			/>
		</div>
	);
}

export default function V1({ score }: Props) {
	const [open, setOpen] = useState(true);
	const c = moodColor(score);
	const sorted = [...coins].sort((a, b) => b.score - a.score);
	const total = coins.length;
	return (
		<>
			<style>{css}</style>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="absolute flex h-8 items-center gap-2 rounded-xs bg-control px-2.5 hover:bg-control-hover"
				style={{ left: 1218, top: 8, ["--c" as string]: c }}
				aria-label={`Pool mood ${signed(score)}, ${labelOf(score)}`}
			>
				<span className="mr1-ring">
					<b />
					<i />
				</span>
				<span className="text-sm font-medium tabular-nums" style={{ color: c }}>
					{signed(score)}
				</span>
			</button>
			{open && (
				<div
					className="mr1-pop absolute w-[380px] rounded-xs bg-overlay p-4 shadow-menu"
					style={{ right: 56, top: 48 }}
				>
					<div className="flex items-start justify-between">
						<div>
							<div className="text-xs text-fg-muted">Pool mood</div>
							<div className="mt-1 flex items-baseline gap-2">
								<span className="text-[40px] leading-none font-semibold tabular-nums" style={{ color: c }}>
									{signed(score)}
								</span>
								<span className="text-sm text-fg-secondary">{labelOf(score)}</span>
							</div>
						</div>
						<div className="text-right text-xs text-fg-muted">
							37 traders
							<br />
							Updated {updated}
						</div>
					</div>
					<div className="mt-4">
						<Bar value={score} h={8} />
						<div className="mt-1 flex justify-between text-2xs text-fg-muted">
							<span>-100</span>
							<span>0</span>
							<span>+100</span>
						</div>
					</div>
					<div className="mt-4 grid grid-cols-2 gap-2">
						{[
							["Positions", overall.posScore, "60%"],
							["Order flow 24h", overall.flowScore, "40%"],
						].map(([l, v, w]) => (
							<div key={l as string} className="rounded-xs bg-control p-2.5">
								<div className="flex justify-between text-xs text-fg-muted">
									<span>{l}</span>
									<span>{w}</span>
								</div>
								<div className="mt-1 text-base font-medium tabular-nums" style={{ color: moodColor(v as number) }}>
									{signed(v as number)}
								</div>
							</div>
						))}
					</div>
					<div className="mt-4 flex h-1.5 overflow-hidden rounded-full">
						<div style={{ width: `${(overall.bullish / total) * 100}%`, background: moodColor(70) }} />
						<div className="bg-fg-disabled" style={{ width: `${(overall.neutral / total) * 100}%` }} />
						<div style={{ width: `${(overall.bearish / total) * 100}%`, background: moodColor(-70) }} />
					</div>
					<div className="mt-1.5 flex justify-between text-xs text-fg-muted">
						<span>{overall.bullish} bullish</span>
						<span>{overall.neutral} neutral</span>
						<span>{overall.bearish} bearish</span>
					</div>
					<div className="mt-4 max-h-[260px] overflow-y-auto">
						{sorted.map((x) => (
							<div key={x.coin} className="grid grid-cols-[64px_1fr_40px] items-center gap-3 py-1.5">
								<span className="text-xs font-medium">{name(x.coin)}</span>
								<Bar value={x.score} />
								<span className="text-right text-xs tabular-nums" style={{ color: moodColor(x.score) }}>
									{signed(x.score)}
								</span>
							</div>
						))}
					</div>
					<button type="button" className="mt-3 h-9 w-full rounded-xs bg-control text-sm hover:bg-control-hover">
						Open Auto Trader
					</button>
				</div>
			)}
		</>
	);
}
