import { Button, ModalContent, ModalFooter, ModalHeader, Tooltip } from "@hypeterminal/ui";
import { LockSimpleIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { coinLabel, LOCK_TITLE, lockBody, type Props, positions, SUB_DEFAULT_NAME, WARNING } from "./data";
import { PositionLine, PositionsTable, SubFields, Surface } from "./parts";

type Where = "main" | "sub";

const TABS: { id: Where; label: string }[] = [
	{ id: "main", label: "Continue on Main" },
	{ id: "sub", label: "Create a sub-account" },
];

export default function V5({ scene, mobile }: Props) {
	if (scene === "close") return <LockedClose />;
	return <StartWarning initial={scene === "sub" ? "sub" : "main"} mobile={mobile} />;
}

function StartWarning({ initial, mobile }: { initial: Where; mobile?: boolean }) {
	const [open, setOpen] = useState(true);
	const [where, setWhere] = useState(initial);
	const [name, setName] = useState(SUB_DEFAULT_NAME);
	const [amount, setAmount] = useState(initial === "sub" ? "5000" : "");

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
			<ModalHeader divider={false}>
				<h2 className="text-base font-medium">Where should Auto Trader run?</h2>
			</ModalHeader>
			<div className="px-4">
				<div className="grid grid-cols-2 rounded-full bg-control p-0.5 text-xs">
					{TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							aria-pressed={where === t.id}
							onClick={() => setWhere(t.id)}
							className={cn(
								"h-8 rounded-full transition-colors",
								where === t.id ? "bg-control-hover font-medium text-fg" : "text-fg-muted hover:text-fg",
							)}
						>
							{t.label}
						</button>
					))}
				</div>
			</div>
			{where === "main" ? (
				<div key="main" className="mood-fade-in">
					<ModalContent className="flex flex-col gap-3">
						<p className="flex items-start gap-2 text-sm">
							<WarningIcon weight="fill" className="mt-0.5 size-4 flex-none text-warning" />
							{WARNING}
						</p>
						<div className="flex flex-col gap-3 rounded-12 bg-control p-3">
							{positions.map((p) => (
								<PositionLine key={p.coin} p={p} />
							))}
						</div>
					</ModalContent>
					<ModalFooter className="pt-0">
						<Button variant="filled" intent="brand" size="md" className="w-full" onClick={proceed}>
							Continue
						</Button>
					</ModalFooter>
				</div>
			) : (
				<div key="sub" className="mood-fade-in">
					<ModalContent className="flex flex-col gap-3">
						<p className="text-sm text-fg-secondary">
							Your {positions.length} open positions stay on Main and stay manual. Auto Trader runs in the new
							sub-account with the USDC you move.
						</p>
						<SubFields name={name} amount={amount} onName={setName} onAmount={setAmount} />
					</ModalContent>
					<ModalFooter className="pt-0">
						<Button
							variant="filled"
							intent="brand"
							size="md"
							className="w-full"
							disabled={!Number(amount) || !name.trim()}
							onClick={createSub}
						>
							Create and start Auto Trader
						</Button>
					</ModalFooter>
				</div>
			)}
		</Surface>
	);
}

function LockedClose() {
	const [live, setLive] = useState(true);
	const [open, setOpen] = useState<string | null>(null);

	function pause() {
		setOpen(null);
		setLive(false);
		toast.success("Auto Trader paused. You can close positions now.");
	}

	function locked(id: string, label: string, coin: string | null) {
		if (!live)
			return (
				<Button key={label} variant="secondary" intent="neutral" size="xs">
					{label}
				</Button>
			);
		const on = open === id;
		return (
			<Popover key={label} open={on} onOpenChange={(next) => setOpen(next ? id : null)}>
				<Tooltip side="top" content="Locked while Auto Trader is on" open={on ? false : undefined}>
					<span className="inline-flex">
						<PopoverTrigger
							render={
								<Button
									variant="secondary"
									intent="neutral"
									size="xs"
									className={cn("pr-2 text-fg-muted", on && "bg-control-hover text-fg")}
									aria-label={`${label} locked while Auto Trader is on`}
								/>
							}
						>
							{label}
							<LockSimpleIcon className="size-3 text-fg-disabled" weight="fill" />
						</PopoverTrigger>
					</span>
				</Tooltip>
				<PopoverContent side="bottom" align="end" sideOffset={6} className="w-80 p-0">
					<div className="flex flex-col gap-1 p-3 pb-2">
						<span className="flex items-center gap-1.5 text-sm font-medium">
							<LockSimpleIcon className="size-3.5 text-fg-muted" weight="fill" />
							{LOCK_TITLE}
						</span>
						<span className="text-xs text-fg-secondary">{lockBody(coin)}</span>
					</div>
					<div className="flex gap-2 p-3 pt-2">
						<Button variant="filled" intent="neutral" size="sm" className="flex-1" onClick={pause}>
							Pause Auto Trader
						</Button>
						<Button variant="secondary" intent="neutral" size="sm" onClick={() => setOpen(null)}>
							Not now
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<div className="pb-48">
			<PositionsTable
				closeAll={locked("all", "Close All", null)}
				action={(p) => (
					<span className="inline-flex items-center gap-1.5">
						{["Limit", "Market", "Reverse"].map((label) => locked(`${p.coin}-${label}`, label, coinLabel(p.coin)))}
					</span>
				)}
			/>
		</div>
	);
}
