import { Button } from "@hypeterminal/ui";
import { useState } from "react";
import { basketFields, type ChoiceFields, copyFields, sameChoice } from "@/lib/auto-trader/choice";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";
import { cn } from "@/lib/cn";
import { setAutoMembers, setAutoTrader, useAutoChoiceStore } from "@/stores/use-auto-choice-store";
import { basketField, defaultMembers, isDefault, membersOrDefault } from "./basket";
import { BasketEditor } from "./basket-editor";
import { basketMood, count, pastedTrader, pnlTone, usd } from "./data";
import { EnterKeyframes } from "./enter-keyframes";
import { Identicon } from "./identicon";
import { MemberStack } from "./member-stack";
import { MoodLine } from "./mood-line";
import { TraderDirectory } from "./trader-directory";

interface Props {
	settings: AutoTraderSettings;
	live: boolean;
	stateLabel: string;
	disabled: boolean;
	onPause: () => void;
	onApply: (fields: ChoiceFields) => void;
}

export function AutoRunning(props: Props) {
	if (props.settings.follow) return <CopyRunning {...props} follow={props.settings.follow} />;
	return <BasketRunning {...props} />;
}

function CopyRunning({ settings, live, stateLabel, disabled, onPause, onApply, follow }: Props & { follow: string }) {
	const [dirOpen, setDirOpen] = useState(false);
	const leverage = useAutoChoiceStore((s) => s.leverage);
	const trader = pastedTrader(follow);
	return (
		<div className="flex animate-[auto-copy-in_200ms_ease-out] flex-col gap-3">
			<EnterKeyframes />
			<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
				<div className="flex items-center gap-3">
					<Identicon id={trader.id} />
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="text-2xs tracking-micro text-fg-muted uppercase">Copying</span>
						<span className="truncate text-sm font-medium">{trader.name}</span>
					</span>
					<StatePill live={live} label={stateLabel} />
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Stat label="Max leverage" value={`${settings.followLeverage ?? leverage}x`} />
					<Stat label="Their PNL 30d" value={usd(trader.pnl.d30, true)} className={pnlTone(trader.pnl.d30)} />
				</div>
				<p className="text-2xs text-fg-muted">
					Degen {trader.degen}, consistency {trader.consistency}
				</p>
			</div>
			<div className="grid grid-cols-2 gap-2">
				<Button variant="secondary" intent="neutral" size="sm" disabled={disabled} onClick={onPause}>
					Pause
				</Button>
				<Button variant="secondary" intent="neutral" size="sm" disabled={disabled} onClick={() => setDirOpen(true)}>
					Change trader
				</Button>
			</div>
			<TraderDirectory
				open={dirOpen}
				onOpenChange={setDirOpen}
				pickedId={trader.id}
				onPick={(t) => {
					setAutoTrader(t.id);
					setDirOpen(false);
					onApply(copyFields(t.id, settings.followLeverage ?? leverage));
				}}
			/>
		</div>
	);
}

function BasketRunning({ settings, live, stateLabel, disabled, onPause, onApply }: Props) {
	const [editorOpen, setEditorOpen] = useState(false);
	const draft = useAutoChoiceStore((s) => s.members);
	const members = membersOrDefault(draft);
	const ids = settings.basket ?? defaultMembers().map((m) => m.id);
	const mood = basketMood(ids);

	function close(open: boolean) {
		setEditorOpen(open);
		if (open) return;
		const fields = basketFields(basketField(draft));
		if (!sameChoice(settings, fields)) onApply(fields);
	}

	return (
		<div className="flex animate-[auto-copy-in_200ms_ease-out] flex-col gap-3">
			<EnterKeyframes />
			<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
				<div className="flex items-center justify-between gap-3">
					<span className="flex min-w-0 flex-col">
						<span className="text-2xs tracking-micro text-fg-muted uppercase">Basket</span>
						<span className="text-sm font-medium">{count(ids.length)} traders</span>
					</span>
					<StatePill live={live} label={stateLabel} />
				</div>
				<MoodLine score={mood.score} counted={mood.counted} />
				<MemberStack ids={ids} />
			</div>
			<div className="grid grid-cols-2 gap-2">
				<Button variant="secondary" intent="neutral" size="sm" disabled={disabled} onClick={() => setEditorOpen(true)}>
					Edit basket
				</Button>
				<Button variant="secondary" intent="neutral" size="sm" disabled={disabled} onClick={onPause}>
					Pause
				</Button>
			</div>
			<BasketEditor
				open={editorOpen}
				onOpenChange={close}
				members={members}
				onChange={(next) => setAutoMembers(isDefault(next) ? null : next)}
			/>
		</div>
	);
}

function StatePill({ live, label }: { live: boolean; label: string }) {
	return (
		<span
			className={cn(
				"flex shrink-0 items-center gap-1.5 rounded-full bg-control-hover px-2.5 py-1 text-xs",
				live ? "text-market-up" : "text-fg-muted",
			)}
		>
			<span className={cn("size-1.5 rounded-full", live ? "bg-market-up" : "bg-fg-muted")} />
			{label}
		</span>
	);
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<span className="flex flex-col gap-0.5 rounded-8 bg-control-hover px-3 py-2">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn("text-sm font-medium tabular-nums", className)}>{value}</span>
		</span>
	);
}
