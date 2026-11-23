import { Button, Slider } from "@hypeterminal/ui";
import { CaretRightIcon, CirclesThreeIcon, PencilSimpleIcon, UserFocusIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";
import {
	type AutoChoiceMode,
	FOLLOW_LEVERAGE_MAX,
	FOLLOW_LEVERAGE_MIN,
	setAutoLeverage,
	setAutoMembers,
	setAutoMode,
	setAutoTrader,
	useAutoChoiceStore,
} from "@/stores/use-auto-choice-store";
import { isDefault, membersOrDefault, onIds } from "./basket";
import { BasketEditor } from "./basket-editor";
import { basketMood, count, directory, LEVERAGE_MARKS, pastedTrader } from "./data";
import { Identicon } from "./identicon";
import { MemberStack } from "./member-stack";
import { MoodLine } from "./mood-line";
import { TraderDirectory } from "./trader-directory";

interface Props {
	onStart?: (mode: AutoChoiceMode) => void;
	startDisabled?: boolean;
}

export function AutoChoice({ onStart, startDisabled }: Props) {
	const mode = useAutoChoiceStore((s) => s.mode);
	const trader = useAutoChoiceStore((s) => s.trader);
	const leverage = useAutoChoiceStore((s) => s.leverage);
	const saved = useAutoChoiceStore((s) => s.members);
	const [dirOpen, setDirOpen] = useState(false);
	const [editorOpen, setEditorOpen] = useState(false);
	const picked = trader ? pastedTrader(trader) : null;
	const members = membersOrDefault(saved);
	const ids = onIds(members);
	const mood = basketMood(ids);

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-1 rounded-8 bg-control p-1">
				<ModeTab
					on={mode === "copy"}
					icon={<UserFocusIcon className="size-4" />}
					label="Copy a trader"
					onClick={() => setAutoMode("copy")}
				/>
				<ModeTab
					on={mode === "basket"}
					icon={<CirclesThreeIcon className="size-4" />}
					label="Basket"
					onClick={() => setAutoMode("basket")}
				/>
			</div>

			{mode === "copy" ? (
				<>
					<div className="flex flex-col gap-2">
						<span className="text-xs text-fg-muted">Trader</span>
						<button
							type="button"
							onClick={() => setDirOpen(true)}
							className="group flex items-center gap-3 rounded-8 bg-control px-3 py-2.5 text-left transition-colors hover:bg-control-hover"
						>
							{picked ? (
								<>
									<Identicon id={picked.id} />
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="truncate text-xs font-medium">{picked.name}</span>
										<span className="truncate text-2xs text-fg-muted">
											Degen {picked.degen}, consistency {picked.consistency}
										</span>
									</span>
									<span className="text-xs text-fg-secondary">Change</span>
								</>
							) : (
								<>
									<span className="grid size-8 place-items-center rounded-full bg-surface text-fg-muted">
										<UserFocusIcon className="size-4" />
									</span>
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="text-xs font-medium">Choose trader</span>
										<span className="truncate text-2xs text-fg-muted">
											Browse {directory.length} traders or paste an address
										</span>
									</span>
								</>
							)}
							<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
						</button>
					</div>
					{picked && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-fg-muted">Max leverage</span>
								<span className="tabular-nums">{leverage}x</span>
							</div>
							<Slider
								value={leverage}
								onValueChange={(v) => setAutoLeverage(Array.isArray(v) ? v[0] : v)}
								min={FOLLOW_LEVERAGE_MIN}
								max={FOLLOW_LEVERAGE_MAX}
								step={1}
								marks={LEVERAGE_MARKS}
								onMarkSelect={setAutoLeverage}
							/>
						</div>
					)}
					{onStart && (
						<Button
							variant="filled"
							intent="brand"
							size="md"
							disabled={!picked || startDisabled}
							onClick={() => onStart("copy")}
						>
							{picked ? "Start copy trading" : "Choose a trader first"}
						</Button>
					)}
				</>
			) : (
				<>
					<div className="flex flex-col gap-3 rounded-12 bg-control p-3">
						<div className="flex items-center justify-between gap-3">
							<span className="flex flex-col">
								<span className="text-sm font-medium">{count(ids.length)} traders</span>
								<span className="text-2xs text-fg-muted">
									{isDefault(members) ? "Default mood pool" : "Edited basket"}
								</span>
							</span>
							<button
								type="button"
								onClick={() => setEditorOpen(true)}
								className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-xs transition-colors hover:bg-control-hover"
							>
								<PencilSimpleIcon className="size-3.5" />
								Edit
							</button>
						</div>
						<MemberStack ids={ids} />
						<MoodLine score={mood.score} counted={mood.counted} />
					</div>
					{onStart && (
						<Button
							variant="filled"
							intent="brand"
							size="md"
							disabled={!ids.length || startDisabled}
							onClick={() => onStart("basket")}
						>
							Start basket
						</Button>
					)}
				</>
			)}

			<TraderDirectory
				open={dirOpen}
				onOpenChange={setDirOpen}
				pickedId={picked?.id ?? null}
				onPick={(t) => {
					setAutoTrader(t.id);
					setDirOpen(false);
				}}
			/>
			<BasketEditor
				open={editorOpen}
				onOpenChange={setEditorOpen}
				members={members}
				onChange={(next) => setAutoMembers(isDefault(next) ? null : next)}
			/>
		</div>
	);
}

function ModeTab({ on, icon, label, onClick }: { on: boolean; icon: ReactNode; label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex h-9 items-center justify-center gap-1.5 rounded-6 text-xs transition-colors",
				on ? "bg-control-hover font-medium text-fg" : "text-fg-muted hover:text-fg",
			)}
		>
			{icon}
			{label}
		</button>
	);
}
