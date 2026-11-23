import { Button, Tooltip } from "@hypeterminal/ui";
import { ArrowsLeftRightIcon, RobotIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { account, atRisk, coinLabel, positions, type SceneProps } from "./data";
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

type Where = "sub" | "here";

export default function V5({ scene }: SceneProps) {
	const [mode, setMode] = useState<Mode>(scene === "start" ? "auto" : "manual");
	const [live, setLive] = useState(scene !== "start");
	const [warning, setWarning] = useState(scene === "start");
	const [where, setWhere] = useState<Where>("sub");
	const [name, setName] = useState("Manual");
	const [amount, setAmount] = useState("");

	function pause() {
		setLive(false);
		toast.success("Auto Trader paused. Manual trading is on.");
	}
	function createSub() {
		toast.success(`Sub-account ${name || "Manual"} created. Switched to it.`);
	}
	function confirmStart() {
		setWarning(false);
		if (where === "sub") {
			toast.success("Sub-account Auto created. Auto Trader started there.");
			return;
		}
		setLive(true);
		toast.success("Auto Trader started on this account");
	}

	if (scene === "close")
		return (
			<div className="flex flex-col gap-2">
				{live && (
					<div className="flex w-[1000px] items-center gap-3 rounded-8 bg-surface py-2 pr-2 pl-3 text-xs">
						<RobotIcon className="size-4 text-market-up" weight="fill" />
						<span className="flex-1 text-fg-secondary">
							Auto Trader runs this account. Pause it to close by hand, or trade by hand in a sub-account.
						</span>
						<Button variant="secondary" intent="neutral" size="sm" onClick={createSub}>
							New sub-account
						</Button>
						<Button variant="filled" intent="neutral" size="sm" onClick={pause}>
							Pause
						</Button>
					</div>
				)}
				<PositionsTable
					action={() =>
						live ? (
							<Tooltip side="bottom" content="Pause Auto Trader to close by hand">
								<span>
									<RowButtons disabled />
								</span>
							</Tooltip>
						) : (
							<RowButtons />
						)
					}
				/>
			</div>
		);

	const panel = (
		<PanelShell mode={mode} live={live} onMode={setMode}>
			{mode === "manual" && !live && <ManualForm className="mood-fade-in" />}
			{mode === "manual" && live && (
				<div className="mood-fade-in flex flex-col gap-4 px-3 pt-4 pb-3">
					<div className="flex items-center gap-3 rounded-12 bg-control p-3">
						<span className="grid size-9 flex-none place-items-center rounded-full bg-success-soft text-market-up">
							<RobotIcon className="size-4" weight="fill" />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block text-xs font-medium">Auto Trader runs this account</span>
							<span className="block text-2xs text-fg-muted">Manual orders are off here</span>
						</span>
						<Button variant="secondary" intent="neutral" size="sm" className="bg-control-hover" onClick={pause}>
							Pause
						</Button>
					</div>

					<div className="flex flex-col gap-3 rounded-12 bg-control p-3">
						<div className="flex items-center gap-2">
							<ArrowsLeftRightIcon className="size-4 text-fg-muted" />
							<span className="text-xs font-medium">Trade by hand in a sub-account</span>
						</div>
						<p className="text-xs text-fg-muted">
							Auto Trader keeps running here. A sub-account has its own balance and positions, so your trades and its
							trades stay apart.
						</p>
						<label className="flex h-10 items-center justify-between gap-3 rounded-8 bg-control-hover px-3 text-xs">
							<span className="text-fg-muted">Name</span>
							<input
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="min-w-0 flex-1 bg-transparent text-right outline-none"
							/>
						</label>
						<label className="flex h-10 items-center justify-between gap-3 rounded-8 bg-control-hover px-3 text-xs">
							<span className="text-fg-muted">Move USDC</span>
							<input
								value={amount}
								inputMode="decimal"
								placeholder="0.00"
								onChange={(e) => setAmount(e.target.value)}
								className="min-w-0 flex-1 bg-transparent text-right tabular-nums outline-none placeholder:text-fg-muted"
							/>
						</label>
						<Button variant="filled" intent="neutral" size="md" onClick={createSub}>
							Create sub-account
						</Button>
					</div>
				</div>
			)}
			{mode === "auto" && <AutoBody live={live} onToggle={() => (live ? pause() : setWarning(true))} />}
		</PanelShell>
	);

	if (scene === "manual") return panel;

	return (
		<ModalStage behind={panel} open={warning}>
			<ModalCard title={`You have ${positions.length} open positions`} onClose={() => setWarning(false)}>
				<p className="text-sm text-fg-secondary">
					Auto Trader manages every position in the account it runs on. Where should it run?
				</p>
				<div className="flex flex-col gap-2.5 rounded-12 bg-control p-3">
					{positions.map((p) => (
						<PositionMini key={p.coin} p={p} />
					))}
				</div>
				<Option
					on={where === "sub"}
					onPick={() => setWhere("sub")}
					title="In a new sub-account"
					tag="Suggested"
					body={`Your ${positions.length} positions stay here and you keep trading them by hand. Move USDC to the sub-account for Auto Trader.`}
				/>
				<Option
					on={where === "here"}
					onPick={() => setWhere("here")}
					title={`On this account (${account.usr.slice(0, 6)}…)`}
					body={`Auto Trader takes over all ${positions.length} positions. Manual trading stays off while it runs.`}
					risk={`It can close ${atRisk.map((p) => coinLabel(p.coin)).join(" and ")}. They are not on its market list.`}
				/>
				<div className="grid grid-cols-2 gap-2">
					<Button variant="secondary" intent="neutral" size="md" onClick={() => setWarning(false)}>
						Cancel
					</Button>
					<Button variant="filled" intent="brand" size="md" onClick={confirmStart}>
						{where === "sub" ? "Set up sub-account" : "Start here"}
					</Button>
				</div>
			</ModalCard>
		</ModalStage>
	);
}

function Option({
	on,
	onPick,
	title,
	tag,
	body,
	risk,
}: {
	on: boolean;
	onPick: () => void;
	title: string;
	tag?: string;
	body: string;
	risk?: string;
}) {
	return (
		<button
			type="button"
			onClick={onPick}
			aria-pressed={on}
			className={cn(
				"flex gap-3 rounded-12 p-3 text-left transition-colors",
				on ? "bg-control-hover" : "bg-control hover:bg-control-hover",
			)}
		>
			<span
				className={cn(
					"mt-0.5 grid size-4 flex-none place-items-center rounded-full transition-colors",
					on ? "bg-fill" : "bg-background",
				)}
			>
				{on && <span className="size-1.5 rounded-full bg-background" />}
			</span>
			<span className="flex min-w-0 flex-col gap-1">
				<span className="flex items-center gap-2 text-sm font-medium">
					{title}
					{tag && <span className="rounded-full bg-background px-1.5 py-px text-2xs text-fg-secondary">{tag}</span>}
				</span>
				<span className="text-xs text-fg-muted">{body}</span>
				{risk && (
					<span className="inline-flex items-start gap-1 text-xs text-warning">
						<WarningIcon weight="fill" className="mt-0.5 size-3 flex-none" />
						{risk}
					</span>
				)}
			</span>
		</button>
	);
}
