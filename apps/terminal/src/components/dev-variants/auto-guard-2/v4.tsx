import { Button, ModalContent, ModalFooter, ModalHeader } from "@hypeterminal/ui";
import { LockSimpleIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import {
	coinLabel,
	LOCK_TITLE,
	lockBody,
	type Props,
	positions,
	SUB_DEFAULT_NAME,
	signedUsd,
	sizeText,
	usd,
	WARNING,
} from "./data";
import { PositionsTable, SubFields, Surface } from "./parts";

export default function V4({ scene, mobile }: Props) {
	if (scene === "close") return <LockedClose />;
	return <StartWarning initial={scene === "sub"} mobile={mobile} />;
}

function StartWarning({ initial, mobile }: { initial: boolean; mobile?: boolean }) {
	const [open, setOpen] = useState(true);
	const [sub, setSub] = useState(initial);
	const [name, setName] = useState(SUB_DEFAULT_NAME);
	const [amount, setAmount] = useState(initial ? "5000" : "");

	function proceed() {
		setOpen(false);
		toast.success("Auto Trader started on Main account");
	}
	function createSub() {
		setOpen(false);
		toast.success(
			`Sub-account ${name} created with $${Number(amount).toLocaleString("en-US")}. Auto Trader started there.`,
		);
	}

	return (
		<Surface mobile={mobile} open={open} onClose={() => setOpen(false)}>
			<ModalHeader>
				<h2 className="text-base font-medium">Start Auto Trader</h2>
			</ModalHeader>
			<ModalContent className="flex flex-col gap-3">
				<div className="flex items-start gap-2 rounded-12 bg-control p-3 text-sm">
					<WarningIcon weight="fill" className="mt-0.5 size-4 flex-none text-warning" />
					{WARNING}
				</div>
				<div className="text-xs">
					<div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-1 pb-1.5 text-2xs text-fg-muted">
						<span>Position</span>
						<span className="text-right">Value</span>
						<span className="w-16 text-right">PNL</span>
					</div>
					{positions.map((p) => {
						const long = p.szi > 0;
						return (
							<div
								key={p.coin}
								className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-stroke-faint px-1 py-2 tabular-nums"
							>
								<span className="flex min-w-0 items-center gap-2">
									<AssetDisplay coin={p.coin} hideName iconClassName="size-4" />
									<span className={long ? "text-market-up" : "text-market-down"}>{coinLabel(p.coin)}</span>
									<span className="truncate text-fg-muted">{sizeText(p)}</span>
								</span>
								<span className="text-right">{usd(p.ntl)}</span>
								<span className={cn("w-16 text-right", p.upnl >= 0 ? "text-market-up" : "text-market-down")}>
									{signedUsd(p.upnl)}
								</span>
							</div>
						);
					})}
				</div>
			</ModalContent>
			{sub ? (
				<div key="sub" className="mood-fade-in m-4 mt-0 flex flex-col gap-3 rounded-12 bg-surface p-3">
					<div className="flex items-baseline justify-between">
						<span className="text-sm font-medium">Create a sub-account</span>
						<button type="button" onClick={() => setSub(false)} className="text-xs text-fg-muted hover:text-fg">
							Cancel
						</button>
					</div>
					<SubFields name={name} amount={amount} onName={setName} onAmount={setAmount} />
					<Button
						variant="filled"
						intent="brand"
						size="md"
						disabled={!Number(amount) || !name.trim()}
						onClick={createSub}
					>
						Create and start Auto Trader
					</Button>
				</div>
			) : (
				<ModalFooter key="choose" className="grid grid-cols-2 gap-2 pt-0">
					<Button variant="secondary" intent="neutral" size="md" onClick={() => setSub(true)}>
						Create a sub-account
					</Button>
					<Button variant="filled" intent="brand" size="md" onClick={proceed}>
						Continue
					</Button>
				</ModalFooter>
			)}
		</Surface>
	);
}

function LockedClose() {
	const [live, setLive] = useState(true);
	const [row, setRow] = useState<string | null>(null);
	const [hit, setHit] = useState<string | null>(null);

	function pause() {
		setRow(null);
		setLive(false);
		toast.success("Auto Trader paused. You can close positions now.");
	}

	function notice(coin: string | null) {
		return (
			<div className="mood-fade-in flex items-center gap-3 bg-control py-2 pr-2 pl-3">
				<LockSimpleIcon className="size-4 flex-none text-fg-muted" weight="fill" />
				<span className="min-w-0 flex-1">
					<span className="font-medium">{LOCK_TITLE}.</span> <span className="text-fg-secondary">{lockBody(coin)}</span>
				</span>
				<Button variant="ghost" intent="neutral" size="xs" onClick={() => setRow(null)}>
					Keep it on
				</Button>
				<Button variant="filled" intent="neutral" size="xs" onClick={pause}>
					Pause Auto Trader
				</Button>
			</div>
		);
	}

	function lockedButton(id: string, label: string) {
		const on = row === id && hit === label;
		if (!live)
			return (
				<Button key={label} variant="secondary" intent="neutral" size="xs">
					{label}
				</Button>
			);
		return (
			<Button
				key={label}
				variant="secondary"
				intent="neutral"
				size="xs"
				aria-expanded={on}
				aria-label={`${label} locked while Auto Trader is on`}
				className={cn("text-fg-muted", on && "bg-control-hover text-fg")}
				onClick={() => {
					setRow(on ? null : id);
					setHit(label);
				}}
			>
				<LockSimpleIcon className="size-3" weight="fill" />
				{label}
			</Button>
		);
	}

	return (
		<PositionsTable
			closeAll={lockedButton("all", "Close All")}
			banner={row === "all" ? notice(null) : null}
			expanded={row}
			expansion={(p) => notice(coinLabel(p.coin))}
			action={(p) => (
				<span className="inline-flex items-center gap-1">
					{["Limit", "Market", "Reverse"].map((label) => lockedButton(p.coin, label))}
				</span>
			)}
		/>
	);
}
