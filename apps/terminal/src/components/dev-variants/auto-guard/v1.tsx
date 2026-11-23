import { Button, Tooltip } from "@hypeterminal/ui";
import { LockSimpleIcon, RobotIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { atRisk, coinLabel, positions, resized, type SceneProps } from "./data";
import {
	AutoBody,
	ManualForm,
	ModalCard,
	ModalStage,
	type Mode,
	PanelShell,
	PositionMini,
	PositionsTable,
	RowButtons,
} from "./panel";

export default function V1({ scene }: SceneProps) {
	const [mode, setMode] = useState<Mode>(scene === "start" ? "auto" : "manual");
	const [live, setLive] = useState(scene !== "start");
	const [warning, setWarning] = useState(scene === "start");

	function pause() {
		setLive(false);
		toast.success("Auto Trader paused. Manual trading is on.");
	}
	function start() {
		setWarning(false);
		setLive(true);
		toast.success("Auto Trader started");
	}

	if (scene === "close")
		return (
			<PositionsTable
				action={() =>
					live ? (
						<Tooltip side="bottom" content="Auto Trader manages this position. Pause it to close by hand.">
							<button
								type="button"
								className="inline-flex h-7 items-center gap-1.5 rounded-full bg-control px-3 text-xs text-fg-muted transition-colors hover:bg-control-hover hover:text-fg"
							>
								<LockSimpleIcon className="size-3.5" />
								Auto Trader
							</button>
						</Tooltip>
					) : (
						<RowButtons />
					)
				}
			/>
		);

	const panel = (
		<PanelShell mode={mode} live={live} onMode={setMode}>
			{mode === "auto" ? (
				<AutoBody live={live} onToggle={() => (live ? pause() : setWarning(true))} />
			) : (
				<div className="relative">
					<ManualForm disabled={live} />
					{live && (
						<div className="mood-fade-in absolute inset-x-3 top-3 flex flex-col gap-3 rounded-12 bg-overlay p-4 shadow-menu">
							<span className="grid size-9 place-items-center rounded-full bg-success-soft text-market-up">
								<RobotIcon className="size-4.5" weight="fill" />
							</span>
							<div>
								<div className="text-sm font-medium">Auto Trader is trading this account</div>
								<p className="mt-1 text-xs text-fg-muted">
									Manual orders are off while it runs. Your orders and its orders would fight over the same positions.
								</p>
							</div>
							<Button variant="filled" intent="neutral" size="md" onClick={pause}>
								Pause Auto Trader
							</Button>
							<button
								type="button"
								onClick={() => setMode("auto")}
								className="self-center text-xs text-fg-secondary transition-colors hover:text-fg"
							>
								Open Auto tab
							</button>
						</div>
					)}
				</div>
			)}
		</PanelShell>
	);

	if (scene === "manual") return panel;

	return (
		<ModalStage behind={panel} open={warning}>
			{
				<ModalCard title="Start Auto Trader?" onClose={() => setWarning(false)}>
					<p className="text-sm text-fg-secondary">
						Auto Trader takes over this whole account. You have {positions.length} open positions. Manual trading stays
						off until you pause it.
					</p>
					<div className="flex flex-col gap-2.5">
						<span className="text-2xs tracking-micro text-fg-muted uppercase">Resized every cycle</span>
						{resized.map((p) => (
							<PositionMini key={p.coin} p={p} />
						))}
					</div>
					<div className="flex flex-col gap-2.5">
						<span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
							<WarningIcon weight="fill" className="size-3.5" />
							Not on its market list, can be closed
						</span>
						{atRisk.map((p) => (
							<PositionMini key={p.coin} p={p} />
						))}
						<p className="text-xs text-fg-muted">
							Close {atRisk.map((p) => coinLabel(p.coin)).join(" and ")} yourself first if you want to keep control of
							them.
						</p>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<Button variant="secondary" intent="neutral" size="md" onClick={() => setWarning(false)}>
							Cancel
						</Button>
						<Button variant="filled" intent="brand" size="md" onClick={start}>
							Start
						</Button>
					</div>
				</ModalCard>
			}
		</ModalStage>
	);
}
