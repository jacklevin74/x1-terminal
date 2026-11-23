import { useState } from "react";
import { coins, labelOf, moodColor, name, overall, signed, sparkPath, updated } from "./data";

interface Props {
	score: number;
}

const css = `
.mr5-orb{width:52px;height:52px;border-radius:999px}
.mr5-orb .g{position:absolute;inset:6px;border-radius:999px;background:var(--c);filter:blur(16px);opacity:.55;animation:mr5-breathe 4s ease-in-out infinite}
.mr5-orb .r{position:absolute;inset:0;border-radius:999px;background:var(--color-overlay)}
.mr5-orb .r::before{content:"";position:absolute;inset:6px;border-radius:999px;background:conic-gradient(from 210deg,var(--c),color-mix(in oklch,var(--c) 50%,#fff) 25%,var(--c) 50%,color-mix(in oklch,var(--c) 55%,#000) 75%,var(--c));
 -webkit-mask:radial-gradient(circle,transparent 13px,#000 14px);mask:radial-gradient(circle,transparent 13px,#000 14px);animation:mr5-spin 12s linear infinite}
@keyframes mr5-spin{to{transform:rotate(360deg)}}
@keyframes mr5-breathe{50%{opacity:.3;transform:scale(.9)}}
.mr5-panel{transform-origin:bottom right;animation:mr5-in .22s cubic-bezier(.2,.8,.2,1)}
@keyframes mr5-in{from{opacity:0;transform:scale(.97) translateY(6px)}}
`;

export default function V5({ score }: Props) {
	const [open, setOpen] = useState(true);
	const moved = coins
		.map((c) => ({ ...c, delta: c.score - c.history[0][1] }))
		.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
		.slice(0, 5);
	const longest = [...coins].sort((a, b) => b.score - a.score).slice(0, 3);
	const shortest = [...coins].sort((a, b) => a.score - b.score).slice(0, 3);
	const h = overall.history;
	const first = h[0][1];
	const W = 348;
	const H = 96;
	const line = sparkPath(h, W, H);
	return (
		<>
			<style>{css}</style>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="mr5-orb absolute"
				style={{ right: 24, bottom: 44, ["--c" as string]: moodColor(score) }}
				aria-label={`Pool mood ${signed(score)}`}
			>
				<span className="g" />
				<span className="r" />
				<span
					className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums"
					style={{ color: moodColor(score) }}
				>
					{signed(score)}
				</span>
			</button>
			{open && (
				<div
					className="mr5-panel absolute w-[380px] rounded-xs bg-overlay p-4 shadow-menu"
					style={{ right: 24, bottom: 108 }}
				>
					<div className="flex items-baseline justify-between">
						<span className="text-xs text-fg-muted">Pool mood</span>
						<span className="text-xs text-fg-muted">{updated}</span>
					</div>
					<div className="mt-1 flex items-baseline gap-2">
						<span className="text-[40px] leading-none font-semibold tabular-nums" style={{ color: moodColor(score) }}>
							{signed(score)}
						</span>
						<span className="text-sm text-fg-secondary">{labelOf(score)}</span>
						<span className="ml-auto text-xs tabular-nums text-fg-muted">{signed(score - first)} in 24h</span>
					</div>
					<svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-24 w-full">
						{[-60, -20, 20, 60].map((s) => (
							<line
								key={s}
								x1="0"
								x2={W}
								y1={(1 - (s + 100) / 200) * H}
								y2={(1 - (s + 100) / 200) * H}
								stroke="var(--color-stroke-faint)"
							/>
						))}
						<line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--color-stroke-weak)" />
						<path d={line} fill="none" stroke={moodColor(score)} strokeWidth="2" strokeLinejoin="round" />
					</svg>
					<div className="flex justify-between text-2xs text-fg-muted">
						<span>24h ago</span>
						<span>Now</span>
					</div>
					<div className="mt-4 text-xs text-fg-muted">Biggest moves in 24h</div>
					<div className="mt-1.5">
						{moved.map((c) => (
							<div key={c.coin} className="flex items-center gap-3 py-1.5 text-xs">
								<span className="w-14 font-medium">{name(c.coin)}</span>
								<svg viewBox="0 0 120 20" className="h-5 w-[120px]">
									<path d={sparkPath(c.history, 120, 20)} fill="none" stroke={moodColor(c.score)} strokeWidth="1.25" />
								</svg>
								<span className="ml-auto tabular-nums text-fg-muted">{signed(c.history[0][1])}</span>
								<span className="text-fg-muted">→</span>
								<span className="w-8 text-right tabular-nums" style={{ color: moodColor(c.score) }}>
									{signed(c.score)}
								</span>
							</div>
						))}
					</div>
					<div className="mt-3 grid grid-cols-2 gap-2">
						{[
							["Most bullish", longest],
							["Most bearish", shortest],
						].map(([l, list]) => (
							<div key={l as string} className="rounded-xs bg-control p-2.5">
								<div className="text-xs text-fg-muted">{l as string}</div>
								{(list as typeof coins).map((c) => (
									<div key={c.coin} className="mt-1 flex justify-between text-xs">
										<span>{name(c.coin)}</span>
										<span className="tabular-nums" style={{ color: moodColor(c.score) }}>
											{signed(c.score)}
										</span>
									</div>
								))}
							</div>
						))}
					</div>
				</div>
			)}
		</>
	);
}
