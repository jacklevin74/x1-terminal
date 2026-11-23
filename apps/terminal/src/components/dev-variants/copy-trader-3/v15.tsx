import { cn } from "@/lib/cn";
import type { DirTrader, VariantProps } from "../copy-trader-2/data";
import { usd } from "../copy-trader-2/data";
import { AutoPanel, type BasketEditorProps, type DirectoryProps } from "../copy-trader-2/panel";
import { BasketEditor as SharedBasketEditor, Directory as SharedDirectory } from "./shared";
import { Frame, MonthTicks, Stats, smoothPath } from "./spark";

export default function V15(props: VariantProps & { edited?: boolean }) {
	return <AutoPanel {...props} Directory={Directory} BasketEditor={BasketEditor} />;
}

function Directory(props: DirectoryProps) {
	return <SharedDirectory {...props} Consistency={Consistency} />;
}

function BasketEditor(props: BasketEditorProps) {
	return <SharedBasketEditor {...props} Consistency={Consistency} />;
}

function Consistency({ t }: { t: DirTrader }) {
	return (
		<Frame
			t={t}
			height={168}
			padTop={44}
			padBottom={10}
			after={(c) => (
				<>
					<MonthTicks c={c} />
					<Stats c={c} />
				</>
			)}
		>
			{(c) => {
				const d = smoothPath(c.pts);
				return (
					<>
						<foreignObject x={0} y={0} width={c.w} height={40}>
							<div className="flex items-baseline justify-between">
								<span
									className={cn(
										"text-xl leading-none font-semibold tabular-nums",
										c.last >= 0 ? "text-market-up" : "text-market-down",
									)}
								>
									{usd(c.last, true)}
								</span>
								<span className="text-2xs text-fg-muted">cumulative PNL, {c.months.length} months</span>
							</div>
						</foreignObject>
						{[0.25, 0.5, 0.75].map((f) => (
							<line key={f} x1={0} x2={c.w} y1={44 + f * 114} y2={44 + f * 114} stroke="var(--color-control-hover)" />
						))}
						<line x1={0} x2={c.w} y1={c.zero} y2={c.zero} stroke="var(--color-fg-disabled)" strokeDasharray="2 4" />
						<path
							d={`${d} L${c.w},${c.y(c.min)} L0,${c.y(c.min)} Z`}
							fill={`color-mix(in oklch, ${c.tone} 10%, var(--color-control))`}
						/>
						<path d={d} fill="none" stroke={c.tone} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
					</>
				);
			}}
		</Frame>
	);
}
