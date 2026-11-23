import { Button } from "@hypeterminal/ui";
import { CheckIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { atRisk, coinLabel, type Position, positions, resized, type SceneProps } from "./data";
import { AutoBody, ManualForm, type Mode, PanelShell, PositionMini, PositionsTable } from "./panel";

export default function V2({ scene }: SceneProps) {
	const [mode, setMode] = useState<Mode>(scene === "start" ? "auto" : "manual");
	const [live, setLive] = useState(scene !== "start");
	const [review, setReview] = useState(scene === "start");
	const [agreed, setAgreed] = useState(false);
	const [asking, setAsking] = useState<string | null>(null);

	function pause() {
		setLive(false);
		toast.success("Auto Trader paused. Manual trading is on.");
	}
	function resume() {
		setLive(true);
		toast.success("Auto Trader resumed");
	}
	function start() {
		setReview(false);
		setAgreed(false);
		setLive(true);
		toast.success("Auto Trader started");
	}
	function pauseAndClose(p: Position) {
		setAsking(null);
		setLive(false);
		toast.success(`Auto Trader paused. ${coinLabel(p.coin)} closed at market.`);
	}

	function onClose(p: Position) {
		if (live) setAsking(asking === p.coin ? null : p.coin);
		else toast.success(`${coinLabel(p.coin)} closed at market`);
	}

	if (scene === "close")
		return (
			<PositionsTable
				action={(p) => (
					<span className="relative">
						<Button variant="secondary" intent="neutral" size="xs" onClick={() => onClose(p)}>
							Close
						</Button>
						{asking === p.coin && (
							<span className="mood-fade-in absolute top-full right-0 z-10 mt-2 flex w-64 flex-col gap-3 rounded-12 bg-overlay p-3 text-left shadow-menu">
								<span className="text-xs text-fg-secondary">
									Auto Trader is live and manages {coinLabel(p.coin)}. Pause it, then close at market?
								</span>
								<span className="grid grid-cols-2 gap-2">
									<Button variant="secondary" intent="neutral" size="sm" onClick={() => setAsking(null)}>
										Cancel
									</Button>
									<Button variant="filled" intent="neutral" size="sm" onClick={() => pauseAndClose(p)}>
										Pause and close
									</Button>
								</span>
							</span>
						)}
					</span>
				)}
			/>
		);

	return (
		<PanelShell mode={mode} live={live} onMode={setMode}>
			{mode === "manual" && (
				<>
					<div className="mx-3 mt-3 flex items-center gap-3 rounded-8 bg-control py-2 pr-2 pl-3">
						<span className={cn("size-2 flex-none rounded-full", live ? "bg-market-up" : "bg-fg-muted")} />
						<span className="min-w-0 flex-1 text-xs">
							<span className="block">{live ? "Auto Trader is live" : "Auto Trader paused"}</span>
							<span className="block text-2xs text-fg-muted">
								{live ? "Manual orders are off" : "You can trade by hand"}
							</span>
						</span>
						<Button variant={live ? "filled" : "secondary"} intent="neutral" size="sm" onClick={live ? pause : resume}>
							{live ? "Pause" : "Resume"}
						</Button>
					</div>
					<ManualForm disabled={live} />
				</>
			)}
			{mode === "auto" && !review && <AutoBody live={live} onToggle={() => (live ? pause() : setReview(true))} />}
			{mode === "auto" && review && (
				<div className="mood-fade-in flex flex-col gap-4 px-3 pt-4 pb-3">
					<div>
						<div className="text-sm font-medium">Before you start</div>
						<p className="mt-1 text-xs text-fg-muted">
							Auto Trader runs the whole account. It touches all {positions.length} open positions.
						</p>
					</div>
					<div className="flex flex-col gap-2.5 rounded-12 bg-control p-3">
						<span className="text-2xs tracking-micro text-fg-muted uppercase">Resized each cycle</span>
						{resized.map((p) => (
							<PositionMini key={p.coin} p={p} />
						))}
					</div>
					<div className="flex flex-col gap-2.5 rounded-12 bg-control p-3">
						<span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
							<WarningIcon weight="fill" className="size-3.5" />
							Can be closed
						</span>
						<p className="text-2xs text-fg-muted">These coins are not on the Auto Trader market list.</p>
						{atRisk.map((p) => (
							<PositionMini key={p.coin} p={p} />
						))}
					</div>
					<button
						type="button"
						onClick={() => setAgreed(!agreed)}
						className="flex items-start gap-2.5 text-left text-xs"
					>
						<span
							className={cn(
								"mt-px grid size-4 flex-none place-items-center rounded-4 transition-colors",
								agreed ? "bg-fill text-fg-inverse" : "bg-control-hover",
							)}
						>
							{agreed && <CheckIcon weight="bold" className="size-3" />}
						</span>
						<span className="text-fg-secondary">
							Auto Trader can close my {atRisk.map((p) => coinLabel(p.coin)).join(" and ")} positions, and manual
							trading stays off while it runs.
						</span>
					</button>
					<div className="grid grid-cols-2 gap-2">
						<Button variant="secondary" intent="neutral" size="md" onClick={() => setReview(false)}>
							Back
						</Button>
						<Button variant="filled" intent="brand" size="md" disabled={!agreed} onClick={start}>
							Start
						</Button>
					</div>
				</div>
			)}
		</PanelShell>
	);
}
