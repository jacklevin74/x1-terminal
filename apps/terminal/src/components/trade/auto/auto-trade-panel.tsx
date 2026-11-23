import { ArrowUpRightIcon, CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useAutoTrader } from "@/hooks/use-auto-trader";
import { useAutoTraderSetup } from "@/hooks/use-auto-trader-setup";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { basketFields, type ChoiceFields, copyFields, withChoice } from "@/lib/auto-trader/choice";
import { cycleTiming } from "@/lib/auto-trader/cycle-timing";
import { isTrading, PHASE_SHORT_LABEL } from "@/lib/auto-trader/phase";
import { autoStatusText } from "@/lib/auto-trader/status-text";
import { cn } from "@/lib/cn";
import { formatUSD } from "@/lib/format";
import { type AutoChoiceMode, useAutoChoiceStore } from "@/stores/use-auto-choice-store";
import { AutoConfirmModal } from "./auto-confirm-modal";
import { AutoIconStack } from "./auto-icon-stack";
import { AutoMarketsModal } from "./auto-markets-modal";
import { AutoSettingsForm } from "./auto-settings-form";
import { AutoSetup } from "./auto-setup";
import { AutoStartModal } from "./auto-start-modal";
import { AutoStatusCard } from "./auto-status-card";
import { AutoChoice } from "./copy/auto-choice";
import { AutoRunning } from "./copy/auto-running";
import { basketField } from "./copy/basket";

export function AutoTradePanel() {
	const auto = useAutoTrader();
	if (auto.env !== "Mainnet")
		return <AutoNote text="Auto Trader runs on Mainnet only. Switch the network to use it." />;
	if (!auto.available) return <AutoNote text="Connect a wallet to use Auto Trader." />;
	if (auto.loading) return <AutoNote text="Loading Auto Trader…" />;
	if (auto.statusError && !auto.status) return <AutoNote text="Auto Trader status is unavailable. Try again soon." />;
	const body =
		auto.phase === "setup" ? (
			<>
				<div className="px-3 pt-4">
					<AutoChoice />
				</div>
				<AutoSetup />
			</>
		) : (
			<AutoControls auto={auto} />
		);
	if (!auto.demo) return body;
	return (
		<>
			<p className="px-3 pt-3 text-xs text-fg-muted">
				Demo account. Auto Trader actions are simulated and sign nothing.
			</p>
			{body}
		</>
	);
}

function AutoNote({ text }: { text: string }) {
	return <p className="px-3 py-6 text-center text-xs text-fg-muted">{text}</p>;
}

function useNow(active: boolean) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!active) return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [active]);
	return now;
}

type Confirm = "flatten" | "renew" | "remove" | null;

const RENEW_WINDOW_MS = 14 * 86_400_000;

function choiceFields(mode: AutoChoiceMode) {
	const { trader, leverage, members } = useAutoChoiceStore.getState();
	if (mode === "copy" && trader) return copyFields(trader, leverage);
	return basketFields(basketField(members));
}

function AutoControls({ auto }: { auto: ReturnType<typeof useAutoTrader> }) {
	const [starting, setStarting] = useState<ChoiceFields | null>(null);
	const [editingMarkets, setEditingMarkets] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [confirm, setConfirm] = useState<Confirm>(null);
	const setup = useAutoTraderSetup();
	const { subaccount } = useTradingAccount();
	const status = auto.status;
	const trading = isTrading(auto.phase);
	const now = useNow(true);
	const plan = status?.plan;
	const timing = status ? cycleTiming(status, now) : null;
	const { title, subtitle } = autoStatusText(auto.phase, status, timing?.at ? timing.label : null, now);
	const settings = auto.settings;
	const busy = auto.pending !== null || setup.busy !== null;
	const expiresSoon = !!status?.validUntil && (status.renewSoon || status.validUntil - now < RENEW_WINDOW_MS);
	const live = auto.phase === "active" || auto.phase === "waiting";

	function runConfirmed(kind: Confirm) {
		setConfirm(null);
		if (kind === "flatten") void auto.flatten();
		if (kind === "remove") void auto.remove();
		if (kind === "renew") void setup.createKey();
	}

	return (
		<div className="flex flex-col gap-4 px-3 pt-4 pb-3">
			{trading && settings ? (
				<AutoRunning
					settings={settings}
					live={live}
					stateLabel={live ? "Live" : PHASE_SHORT_LABEL[auto.phase]}
					disabled={busy || auto.phase === "closing"}
					onPause={() => void auto.pause()}
					onApply={(fields) => void auto.applyChoice(fields)}
				/>
			) : (
				<AutoChoice
					startDisabled={busy || !settings || auto.phase === "closing"}
					onStart={(mode) => setStarting(choiceFields(mode))}
				/>
			)}

			<AutoStatusCard
				on={trading}
				title={title}
				subtitle={subtitle}
				equity={formatUSD(plan?.equity)}
				actionLabel="Pause"
				busy={auto.pending === "pause"}
				disabled={busy || auto.phase === "closing"}
				onToggle={trading && !settings ? () => void auto.pause() : undefined}
			/>

			{expiresSoon && status?.validUntil && (
				<div className="flex items-center justify-between gap-3 text-xs">
					<span className="text-warning">
						Trading key expires {new Date(status.validUntil).toLocaleDateString([], { month: "short", day: "numeric" })}
					</span>
					<button type="button" className="font-medium text-fg hover:opacity-80" onClick={() => setConfirm("renew")}>
						Renew
					</button>
				</div>
			)}
			{subaccount && !status?.lastCycle && (
				<p className="text-xs text-fg-muted">Waiting for the executor to report a cycle for this subaccount.</p>
			)}

			{settings && (
				<div className="flex flex-col gap-3">
					<button
						type="button"
						aria-expanded={settingsOpen}
						onClick={() => setSettingsOpen((open) => !open)}
						className="flex items-center justify-between text-xs text-fg-muted transition-colors hover:text-fg"
					>
						Settings
						<CaretDownIcon weight="bold" className={cn("size-3 transition-transform", settingsOpen && "rotate-180")} />
					</button>
					{settingsOpen && (
						<>
							<button
								type="button"
								onClick={() => setEditingMarkets(true)}
								className="flex items-center gap-3 rounded-8 bg-control px-3 py-2 text-left transition-colors hover:bg-control-hover"
							>
								<AutoIconStack coins={auto.markets} max={5} />
								<span className="flex-1 text-xs text-fg-secondary">
									<span className="text-fg">{auto.markets.length} markets</span>
									{trading ? "" : " selected"}
								</span>
								<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
							</button>
							<AutoSettingsForm
								key={JSON.stringify(settings)}
								saved={settings}
								saving={auto.pending === "settings"}
								disabled={busy || auto.phase === "closing"}
								onSave={auto.saveSettings}
							/>
						</>
					)}
				</div>
			)}

			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-secondary">
				<button
					type="button"
					disabled={busy}
					className="hover:text-fg disabled:opacity-50"
					onClick={() => setConfirm("flatten")}
				>
					Close all
				</button>
				<button
					type="button"
					disabled={busy}
					className="hover:text-fg disabled:opacity-50"
					onClick={() => setConfirm("renew")}
				>
					Renew key
				</button>
				<button
					type="button"
					disabled={busy}
					className="hover:text-fg disabled:opacity-50"
					onClick={() => setConfirm("remove")}
				>
					Remove
				</button>
				<a href="/auto-trader" className="inline-flex items-center gap-1 hover:text-fg">
					Details
					<ArrowUpRightIcon className="size-3" />
				</a>
				<a href="/API#api-wallets" className="inline-flex items-center gap-1 hover:text-fg">
					API wallets
					<ArrowUpRightIcon className="size-3" />
				</a>
			</div>

			{settings && (
				<AutoStartModal
					open={starting !== null}
					settings={withChoice(settings, starting ?? {})}
					markets={auto.markets}
					onCancel={() => setStarting(null)}
					onConfirm={() => {
						const fields = starting ?? {};
						setStarting(null);
						void auto.startWith(fields);
					}}
				/>
			)}
			{settings && (
				<AutoMarketsModal
					open={editingMarkets}
					settings={settings}
					universe={auto.universe}
					saving={auto.pending === "settings"}
					onClose={() => setEditingMarkets(false)}
					onSave={async (next) => {
						if (await auto.saveSettings(next)) setEditingMarkets(false);
					}}
				/>
			)}
			<AutoConfirmModal
				open={confirm !== null}
				title={CONFIRM_COPY[confirm ?? "flatten"].title}
				body={CONFIRM_COPY[confirm ?? "flatten"].body}
				confirmLabel={CONFIRM_COPY[confirm ?? "flatten"].action}
				onCancel={() => setConfirm(null)}
				onConfirm={() => runConfirmed(confirm)}
			/>
		</div>
	);
}

const CONFIRM_COPY = {
	flatten: {
		title: "Close all positions?",
		body: "Auto Trader pauses first. Then reduce-only market orders close every perp position in this account, including positions you opened by hand. Orders allow up to 1% slippage and fees apply.",
		action: "Close all",
	},
	renew: {
		title: "Renew the trading key?",
		body: "A new trading key replaces the current one. It needs two wallet signatures. Auto Trader is paused after the renewal.",
		action: "Renew",
	},
	remove: {
		title: "Remove Auto Trader?",
		body: "This deletes your Auto Trader settings and its stored key. Positions stay open. The API wallet stays approved until you remove it on the API page.",
		action: "Remove",
	},
} as const;
