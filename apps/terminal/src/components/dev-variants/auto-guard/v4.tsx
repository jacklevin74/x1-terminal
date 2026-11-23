import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { PauseIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { coinLabel, onList, type Position, positions, type SceneProps } from "./data";
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

type Choice = "keep" | "close";

export default function V4({ scene }: SceneProps) {
	const [mode, setMode] = useState<Mode>(scene === "start" ? "auto" : "manual");
	const [live, setLive] = useState(scene !== "start");
	const [warning, setWarning] = useState(scene === "start");
	const [choice, setChoice] = useState<Record<string, Choice>>({});
	const [closing, setClosing] = useState<Position | null>(null);
	const closeCount = positions.filter((p) => choice[p.coin] === "close").length;

	function pause() {
		setLive(false);
		toast.success("Auto Trader paused. Manual trading is on.");
	}
	function start() {
		setWarning(false);
		setLive(true);
		toast.success(closeCount ? `Closed ${closeCount} positions. Auto Trader started.` : "Auto Trader started");
	}
	function pauseAndClose(p: Position) {
		setClosing(null);
		setLive(false);
		toast.success(`Auto Trader paused. ${coinLabel(p.coin)} closed at market.`);
	}

	if (scene === "close")
		return (
			<>
				<PositionsTable action={(p) => <RowButtons onClick={() => (live ? setClosing(p) : undefined)} />} />
				<Modal open={closing !== null} onOpenChange={(open) => !open && setClosing(null)}>
					<ModalPopup size="sm">
						<ModalHeader>
							<ModalTitle>Pause Auto Trader to close {closing ? coinLabel(closing.coin) : ""}?</ModalTitle>
						</ModalHeader>
						<ModalContent className="flex flex-col gap-4">
							<p className="text-sm text-fg-secondary">
								Auto Trader manages this account. If you close a position while it runs, the next cycle can open it
								again. Pause first, then the close goes through.
							</p>
							<div className="grid grid-cols-2 gap-2">
								<Button variant="secondary" intent="neutral" size="md" onClick={() => setClosing(null)}>
									Cancel
								</Button>
								<Button variant="filled" intent="brand" size="md" onClick={() => closing && pauseAndClose(closing)}>
									Pause and close
								</Button>
							</div>
						</ModalContent>
					</ModalPopup>
				</Modal>
			</>
		);

	const panel = (
		<PanelShell mode={mode} live={live} onMode={setMode}>
			{mode === "manual" && (
				<ManualForm
					cta={
						live ? (
							<div className="mood-fade-in flex flex-col gap-2">
								<Button
									variant="filled"
									intent="neutral"
									size="lg"
									className="w-full"
									iconLeft={<PauseIcon weight="fill" className="size-4" />}
									onClick={pause}
								>
									Pause Auto Trader to place orders
								</Button>
								<p className="text-center text-2xs text-fg-muted">Auto Trader is live and manages this account.</p>
							</div>
						) : undefined
					}
				/>
			)}
			{mode === "auto" && <AutoBody live={live} onToggle={() => (live ? pause() : setWarning(true))} />}
		</PanelShell>
	);

	if (scene === "manual") return panel;

	return (
		<ModalStage behind={panel} open={warning}>
			<ModalCard title="Start Auto Trader?" onClose={() => setWarning(false)}>
				<p className="text-sm text-fg-secondary">
					Auto Trader manages the whole account. Choose what happens to each open position first.
				</p>
				<div className="flex flex-col gap-1 rounded-12 bg-control p-1.5">
					{positions.map((p) => {
						const c = choice[p.coin] ?? "keep";
						return (
							<div key={p.coin} className="flex flex-col gap-1.5 rounded-8 px-2 py-2">
								<PositionMini
									p={p}
									aside={
										<span className="flex rounded-full bg-background p-0.5 text-xs">
											{(["keep", "close"] as const).map((k) => (
												<button
													key={k}
													type="button"
													onClick={() => setChoice({ ...choice, [p.coin]: k })}
													className={cn(
														"h-6 rounded-full px-2.5 transition-colors",
														c === k ? "bg-control-hover font-medium text-fg" : "text-fg-muted hover:text-fg",
													)}
												>
													{k === "keep" ? "Keep" : "Close"}
												</button>
											))}
										</span>
									}
								/>
								<Outcome p={p} c={c} />
							</div>
						);
					})}
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Button variant="secondary" intent="neutral" size="md" onClick={() => setWarning(false)}>
						Cancel
					</Button>
					<Button variant="filled" intent="brand" size="md" onClick={start}>
						{closeCount ? `Close ${closeCount} and start` : "Start"}
					</Button>
				</div>
			</ModalCard>
		</ModalStage>
	);
}

function Outcome({ p, c }: { p: Position; c: Choice }) {
	if (c === "close")
		return <span className="pl-7.5 text-2xs text-fg-muted">Closes at market before Auto Trader starts</span>;
	if (onList(p)) return <span className="pl-7.5 text-2xs text-fg-muted">Auto Trader resizes it each cycle</span>;
	return (
		<span className="inline-flex items-center gap-1 pl-7.5 text-2xs text-warning">
			<WarningIcon weight="fill" className="size-3" />
			Not on its list. Auto Trader can close it.
		</span>
	);
}
