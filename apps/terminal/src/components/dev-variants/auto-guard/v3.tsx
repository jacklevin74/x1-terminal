import { Button, Tooltip } from "@hypeterminal/ui";
import { CaretLeftIcon, PauseIcon, RobotIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { account, onList, positions, type SceneProps, usd } from "./data";
import { AutoBody, ManualForm, type Mode, PanelShell, PositionMini, PositionsTable, RowButtons } from "./panel";

export default function V3({ scene }: SceneProps) {
	const [mode, setMode] = useState<Mode>(scene === "start" ? "auto" : "manual");
	const [live, setLive] = useState(scene !== "start");
	const [handover, setHandover] = useState(scene === "start");

	function pause() {
		setLive(false);
		toast.success("Auto Trader paused. Manual trading is on.");
	}
	function start() {
		setHandover(false);
		setLive(true);
		toast.success(`Auto Trader started. It now manages ${positions.length} positions.`);
	}

	if (scene === "close")
		return (
			<div className="flex flex-col gap-2">
				{live && (
					<div className="flex w-[1000px] items-center gap-3 rounded-8 bg-surface py-2 pr-2 pl-3 text-xs">
						<RobotIcon className="size-4 text-market-up" weight="fill" />
						<span className="flex-1 text-fg-secondary">
							Auto Trader manages every position in this account. Pause it to close or reverse by hand.
						</span>
						<Button variant="secondary" intent="neutral" size="sm" onClick={pause}>
							Pause Auto Trader
						</Button>
					</div>
				)}
				<PositionsTable
					action={(p) =>
						live ? (
							<Tooltip
								side="bottom"
								content={onList(p) ? "Resized by Auto Trader each cycle" : "Not on its list. Auto Trader can close it."}
							>
								<span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-control px-3 text-xs text-fg-secondary">
									<RobotIcon className="size-3.5" />
									Managed
								</span>
							</Tooltip>
						) : (
							<RowButtons />
						)
					}
				/>
			</div>
		);

	return (
		<PanelShell mode={mode} live={live} onMode={setMode}>
			{mode === "manual" && live && (
				<div className="mood-fade-in flex flex-col gap-4 px-3 pt-4 pb-3">
					<div className="flex flex-col items-center gap-2 pt-2 text-center">
						<span className="grid size-11 place-items-center rounded-full bg-success-soft text-market-up">
							<RobotIcon className="size-5" weight="fill" />
						</span>
						<div className="text-sm font-medium">Auto Trader runs this account</div>
						<p className="text-xs text-fg-muted">Manual trading comes back when you pause it.</p>
					</div>
					<div className="flex flex-col gap-3 rounded-12 bg-control p-3">
						<div className="flex justify-between text-xs">
							<span className="text-fg-muted">Account equity</span>
							<span className="tabular-nums">{usd(account.equity, 2)}</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-fg-muted">Open positions</span>
							<span className="tabular-nums">{positions.length}</span>
						</div>
						{positions.map((p) => (
							<PositionMini key={p.coin} p={p} />
						))}
					</div>
					<Button
						variant="filled"
						intent="neutral"
						size="lg"
						iconLeft={<PauseIcon weight="fill" className="size-4" />}
						onClick={pause}
					>
						Pause and trade by hand
					</Button>
				</div>
			)}
			{mode === "manual" && !live && <ManualForm className="mood-fade-in" />}
			{mode === "auto" && !handover && <AutoBody live={live} onToggle={() => (live ? pause() : setHandover(true))} />}
			{mode === "auto" && handover && (
				<div className="mood-fade-in flex flex-col gap-4 px-3 pt-3 pb-3">
					<button
						type="button"
						onClick={() => setHandover(false)}
						className="flex h-8 items-center gap-1.5 self-start rounded-full bg-control pr-3.5 pl-2.5 text-xs font-medium transition-colors hover:bg-control-hover"
					>
						<CaretLeftIcon weight="bold" className="size-3.5" />
						Auto
					</button>
					<div>
						<div className="text-base font-medium">Hand over {positions.length} positions</div>
						<p className="mt-1 text-xs text-fg-muted">
							Auto Trader takes the whole account. This is what happens to each open position.
						</p>
					</div>
					<div className="flex flex-col gap-1 rounded-12 bg-control p-1.5">
						{positions.map((p) => (
							<div key={p.coin} className="flex flex-col gap-1.5 rounded-8 px-2 py-2">
								<PositionMini p={p} />
								{onList(p) ? (
									<span className="pl-7.5 text-2xs text-fg-muted">Resized to the mood target each cycle</span>
								) : (
									<span className="inline-flex items-center gap-1 pl-7.5 text-2xs text-warning">
										<WarningIcon weight="fill" className="size-3" />
										Not on its list, can be closed
									</span>
								)}
							</div>
						))}
					</div>
					<p className="text-xs text-fg-muted">Manual orders stay off until you pause Auto Trader.</p>
					<Button variant="filled" intent="brand" size="lg" onClick={start}>
						Start Auto Trader
					</Button>
				</div>
			)}
		</PanelShell>
	);
}
