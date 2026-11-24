import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { IChartingLibraryWidget } from "@/types/charting_library";
import type { LineTag } from "./use-tradingview-lines";

const INSET = 8;
const GAP = 6;

function toneText(tone: LineTag["tone"]) {
	if (tone === "up") return "text-market-up";
	if (tone === "down") return "text-market-down";
	return "text-warning";
}

function toneFill(tone: LineTag["tone"]) {
	if (tone === "up") return "bg-market-up";
	if (tone === "down") return "bg-market-down";
	return "bg-warning";
}

interface Props {
	widget: IChartingLibraryWidget | null;
	tags: LineTag[];
}

export function ChartLineTags({ widget, tags }: Props) {
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const root = rootRef.current;
		if (!widget || !root || !tags.length) return;
		const chart = widget.activeChart();
		const chips = [...root.querySelectorAll<HTMLElement>("[data-index]")];
		const rules = [...root.querySelectorAll<HTMLElement>("[data-rule]")];
		const axisTags = [...root.querySelectorAll<HTMLElement>("[data-axis]")];
		const formatter = chart.priceFormatter();
		let frame = 0;

		function hide() {
			for (const el of [...chips, ...rules, ...axisTags]) el.style.visibility = "hidden";
		}

		function place() {
			frame = requestAnimationFrame(place);
			const iframe = root?.parentElement?.querySelector("iframe");
			const pane = iframe?.contentDocument?.querySelector(".chart-markup-table.pane");
			if (!root || !iframe || !pane) return hide();
			let range: { from: number; to: number } | null = null;
			let mode = 0;
			let inverted = false;
			try {
				const scale = chart.getPanes()[0]?.getMainSourcePriceScale();
				if (!scale) return hide();
				range = scale.getVisiblePriceRange();
				mode = scale.getMode();
				inverted = scale.isInverted();
			} catch {
				return hide();
			}
			if (!range || mode > 1 || (mode === 1 && range.from <= 0)) return hide();
			const map = mode === 1 ? Math.log : (v: number) => v;
			const hi = map(range.to);
			const lo = map(range.from);
			const box = root.getBoundingClientRect();
			const frameBox = iframe.getBoundingClientRect();
			const paneBox = pane.getBoundingClientRect();
			const top = frameBox.top - box.top + paneBox.top;
			const left = frameBox.left - box.left + paneBox.left;
			const placed: { chip: HTMLElement; y: number }[] = [];
			for (const chip of chips) {
				const tag = tags[Number(chip.dataset.index)];
				if (!tag || tag.price <= 0 || hi === lo) {
					chip.style.visibility = "hidden";
					continue;
				}
				const t = (hi - map(tag.price)) / (hi - lo);
				const y = Math.round(top + (inverted ? 1 - t : t) * paneBox.height);
				const inside = y >= top && y <= top + paneBox.height;
				chip.style.visibility = inside ? "visible" : "hidden";
				if (inside) placed.push({ chip, y });
			}
			for (const el of [...rules, ...axisTags]) {
				const tag = tags[Number(el.dataset.rule ?? el.dataset.axis)];
				const chip = chips.find((c) => c.dataset.index === (el.dataset.rule ?? el.dataset.axis));
				const y = chip?.style.visibility === "visible" ? placed.find((p) => p.chip === chip)?.y : undefined;
				if (!tag || y == null) {
					el.style.visibility = "hidden";
					continue;
				}
				el.style.visibility = "visible";
				if (el.dataset.rule != null) {
					el.style.width = `${paneBox.width}px`;
					el.style.transform = `translate(${Math.round(left)}px, ${y}px)`;
				} else {
					el.textContent = formatter.format(tag.price);
					el.style.transform = `translate(${Math.round(left + paneBox.width)}px, ${y}px) translateY(-50%)`;
				}
			}
			placed.sort((a, b) => a.y - b.y);
			let prev: { y: number; x: number; w: number } | null = null;
			for (const { chip, y } of placed) {
				const w = chip.offsetWidth;
				const x: number = prev && Math.abs(y - prev.y) < chip.offsetHeight + 2 ? prev.x + prev.w + GAP : left + INSET;
				chip.style.transform = `translate(${Math.round(x)}px, ${y}px) translateY(-50%)`;
				prev = { y, x, w };
			}
		}

		place();
		return () => cancelAnimationFrame(frame);
	}, [widget, tags]);

	return (
		<div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden">
			{tags.map((tag, index) =>
				tag.interactive ? null : (
					<span
						key={`rule-${tag.key}`}
						data-rule={index}
						className={cn(
							"absolute top-0 left-0 h-px bg-[repeating-linear-gradient(90deg,currentColor_0_4px,transparent_4px_8px)]",
							toneText(tag.tone),
						)}
						style={{ visibility: "hidden" }}
					/>
				),
			)}
			{tags.map((tag, index) =>
				tag.interactive ? null : (
					<span
						key={`axis-${tag.key}`}
						data-axis={index}
						className={cn(
							"absolute top-0 left-0 flex h-5 items-center rounded-4 px-1.5 text-xs whitespace-nowrap text-background tabular-nums",
							toneFill(tag.tone),
						)}
						style={{ visibility: "hidden" }}
					/>
				),
			)}
			{tags.map((tag, index) => (
				<span
					key={tag.key}
					data-index={index}
					className="absolute top-0 left-0 flex h-5 items-center gap-1.5 rounded-full bg-fill pr-2 pl-1.5 text-2xs font-medium whitespace-nowrap text-fg-inverse tabular-nums"
					style={{ visibility: "hidden" }}
				>
					<span
						className={cn(
							"size-1.5 shrink-0 rounded-full",
							tag.tone === "up" && "bg-market-up",
							tag.tone === "down" && "bg-market-down",
							tag.tone === "warning" && "bg-warning",
						)}
					/>
					{tag.body}
					{tag.qty && <span className="text-fg-inverse-muted">{tag.qty}</span>}
				</span>
			))}
		</div>
	);
}
