import { useState } from "react";
import { coins, isStock, labelOf, moodColor, name, overall, signed, updated } from "./data";

interface Props {
	score: number;
}

const css = `
.mr3-stone{position:relative;width:14px;height:14px;border-radius:999px;overflow:hidden;background:var(--c)}
.mr3-stone span{position:absolute;border-radius:999px;filter:blur(3px)}
.mr3-stone span:nth-child(1){width:10px;height:10px;left:-2px;top:-2px;background:var(--c2);animation:mr3-a 5s ease-in-out infinite alternate}
.mr3-stone span:nth-child(2){width:9px;height:9px;right:-2px;bottom:-1px;background:var(--c3);animation:mr3-b 6s ease-in-out infinite alternate}
.mr3-stone span:nth-child(3){width:5px;height:5px;left:3px;top:2px;background:#fff;opacity:.35;filter:blur(1.5px)}
@keyframes mr3-a{to{transform:translate(6px,5px)}}
@keyframes mr3-b{to{transform:translate(-6px,-4px)}}
.mr3-sheet{transform-origin:bottom left;animation:mr3-in .2s cubic-bezier(.2,.8,.2,1)}
@keyframes mr3-in{from{opacity:0;transform:translateY(12px)}}
`;

const tile = (s: number) => `color-mix(in oklch, ${moodColor(s)} ${Math.round(12 + Math.abs(s) * 0.5)}%, #1b1b22)`;

function History() {
	const h = overall.history;
	const W = 340;
	const H = 120;
	const y = (s: number) => (1 - (s + 100) / 200) * H;
	const pts = h.map(([, s], i) => `${((i / (h.length - 1)) * W).toFixed(1)},${y(s).toFixed(1)}`);
	const area = `M0,${H / 2} L${pts.join(" L")} L${W},${H / 2} Z`;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full">
			<defs>
				<clipPath id="mr3-up">
					<rect x="0" y="0" width={W} height={H / 2} />
				</clipPath>
				<clipPath id="mr3-down">
					<rect x="0" y={H / 2} width={W} height={H / 2} />
				</clipPath>
			</defs>
			<path d={area} fill={tile(70)} clipPath="url(#mr3-up)" />
			<path d={area} fill={tile(-70)} clipPath="url(#mr3-down)" />
			<line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--color-stroke-weak)" />
			<polyline points={pts.join(" ")} fill="none" stroke="var(--color-fg-secondary)" strokeWidth="1.25" />
		</svg>
	);
}

export default function V3({ score }: Props) {
	const [open, setOpen] = useState(true);
	const [filter, setFilter] = useState<"all" | "crypto" | "stocks">("all");
	const list = [...coins]
		.filter((c) => filter === "all" || (filter === "stocks") === isStock(c.coin))
		.sort((a, b) => b.score - a.score);
	const first = overall.history[0][1];
	return (
		<>
			<style>{css}</style>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="absolute flex h-5 items-center gap-1.5 rounded-xs px-1.5 text-xs hover:bg-fill-hover"
				style={{
					left: 96,
					top: 878,
					["--c" as string]: moodColor(score),
					["--c2" as string]: moodColor(score + 45),
					["--c3" as string]: moodColor(score - 45),
				}}
			>
				<span className="mr3-stone">
					<span />
					<span />
					<span />
				</span>
				<span className="text-fg-secondary">Mood</span>
				<span className="tabular-nums" style={{ color: moodColor(score) }}>
					{signed(score)}
				</span>
			</button>
			{open && (
				<div
					className="mr3-sheet absolute flex gap-4 rounded-xs bg-overlay p-4 shadow-menu"
					style={{ left: 4, right: 4, bottom: 28, height: 352 }}
				>
					<div className="flex w-[340px] flex-none flex-col">
						<div className="text-xs text-fg-muted">Pool mood · 37 traders · {updated}</div>
						<div className="mt-2 flex items-baseline gap-2">
							<span className="text-[44px] leading-none font-semibold tabular-nums" style={{ color: moodColor(score) }}>
								{signed(score)}
							</span>
							<span className="text-sm text-fg-secondary">{labelOf(score)}</span>
						</div>
						<div className="mt-1 text-xs text-fg-muted">
							{signed(first)} 24h ago · positions {signed(overall.posScore)} · flow {signed(overall.flowScore)}
						</div>
						<div className="mt-auto">
							<History />
							<div className="mt-1 flex justify-between text-2xs text-fg-muted">
								<span>24h ago</span>
								<span>Now</span>
							</div>
						</div>
					</div>
					<div className="flex min-w-0 flex-1 flex-col">
						<div className="mb-3 flex items-center gap-1">
							{(["all", "crypto", "stocks"] as const).map((f) => (
								<button
									key={f}
									type="button"
									onClick={() => setFilter(f)}
									className={`h-7 rounded-xs px-3 text-xs capitalize ${filter === f ? "bg-control-hover text-fg" : "text-fg-muted hover:text-fg"}`}
								>
									{f}
								</button>
							))}
							<span className="ml-auto text-xs text-fg-muted">Tile colour = score, -100 to +100</span>
						</div>
						<div className="grid flex-1 auto-rows-fr grid-cols-6 gap-1">
							{list.map((c) => (
								<div
									key={c.coin}
									className="flex flex-col justify-between rounded-xs p-2.5"
									style={{ background: tile(c.score) }}
								>
									<div className="flex items-baseline justify-between">
										<span className="text-sm font-medium">{name(c.coin)}</span>
										<span className="text-sm font-semibold tabular-nums">{signed(c.score)}</span>
									</div>
									<div className="flex justify-between text-2xs text-fg-secondary">
										<span>Pos {signed(c.posScore)}</span>
										<span>Flow {signed(c.flowScore)}</span>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
