import { XIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef } from "react";
import { snapshot } from "../mood-traders/data";
import { MARKET } from "./data";

interface Props {
	children: ReactNode;
	header?: ReactNode;
	footer?: ReactNode;
	anchor?: boolean;
}

export function Frame({ children, header, footer, anchor = false }: Props) {
	const scroller = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!anchor) return;
		const el = scroller.current;
		const target = el?.querySelector<HTMLElement>("[data-anchor]");
		if (el && target) el.scrollTop = target.offsetTop - 16;
	}, [anchor]);
	return (
		<div
			className="relative h-[860px] w-[600px] flex-none overflow-hidden rounded-8 font-sans text-fg"
			style={{
				backgroundImage: "url(/dev-refs/mood-ring/terminal.png)",
				backgroundSize: "1512px 900px",
				backgroundPosition: "right top",
			}}
		>
			<div className="absolute inset-0 bg-scrim" />
			<div className="absolute inset-y-0 right-0 flex w-[420px] flex-col bg-overlay shadow-menu">
				<div className="flex h-14 flex-none items-center gap-3 px-4">
					<div className="min-w-0 flex-1">{header ?? <Title />}</div>
					{!header && <Tabs />}
					<span className="grid size-8 place-items-center rounded-8 text-fg-muted">
						<XIcon className="size-4" />
					</span>
				</div>
				<div ref={scroller} className="relative flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">
					{children}
				</div>
				{footer}
			</div>
		</div>
	);
}

function Title() {
	const updated = new Date(snapshot.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	return (
		<div>
			<div className="text-sm font-medium">Mood Ring</div>
			<div className="text-2xs text-fg-muted">Updated {updated}</div>
		</div>
	);
}

function Tabs() {
	return (
		<div className="relative flex rounded-full bg-control p-0.5">
			<span className="relative h-7 rounded-full bg-control-hover px-3 text-xs leading-7 font-medium">{MARKET}</span>
			<span className="relative h-7 rounded-full px-3 text-xs leading-7 text-fg-muted">All markets</span>
		</div>
	);
}
