import { Button, ModalContent, ModalFooter, ModalHeader } from "@hypeterminal/ui";
import { CaretLeftIcon, LockSimpleIcon, WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { coinLabel, LOCK_TITLE, lockBody, type Props, positions, SUB_DEFAULT_NAME, WARNING } from "./data";
import { PositionLine, PositionsTable, SubFields, Surface } from "./parts";

export default function V1({ scene, mobile }: Props) {
	if (scene === "close") return <LockedClose />;
	return <StartWarning initial={scene === "sub" ? "sub" : "warn"} mobile={mobile} />;
}

function StartWarning({ initial, mobile }: { initial: "warn" | "sub"; mobile?: boolean }) {
	const [open, setOpen] = useState(true);
	const [step, setStep] = useState(initial);
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
			{step === "warn" ? (
				<div key="warn" className="mood-fade-in">
					<ModalHeader>
						<h2 className="text-base font-medium text-balance">Start Auto Trader on Main account?</h2>
					</ModalHeader>
					<ModalContent className="flex flex-col gap-3">
						<p className="flex items-start gap-2 text-sm text-fg">
							<WarningIcon weight="fill" className="mt-0.5 size-4 flex-none text-warning" />
							{WARNING}
						</p>
						<div className="flex flex-col gap-3 rounded-12 bg-control p-3">
							<div className="text-2xs text-fg-muted">Open positions ({positions.length})</div>
							{positions.map((p) => (
								<PositionLine key={p.coin} p={p} />
							))}
						</div>
						<p className="text-xs text-fg-muted">
							To keep these positions apart from Auto Trader, run it in a sub-account with its own USDC.
						</p>
					</ModalContent>
					<ModalFooter className="grid grid-cols-2 gap-2">
						<Button variant="secondary" intent="neutral" size="md" onClick={() => setStep("sub")}>
							Create a sub-account
						</Button>
						<Button variant="filled" intent="brand" size="md" onClick={proceed}>
							Continue
						</Button>
					</ModalFooter>
				</div>
			) : (
				<div key="sub" className="mood-fade-in">
					<ModalHeader>
						<button
							type="button"
							onClick={() => setStep("warn")}
							className="-ml-1 flex w-fit items-center gap-1 rounded-6 px-1 text-xs text-fg-muted hover:text-fg"
						>
							<CaretLeftIcon className="size-3" weight="bold" />
							Back
						</button>
						<h2 className="text-base font-medium">Create a sub-account</h2>
						<p className="text-xs text-fg-muted">
							Auto Trader runs there with the USDC you move. Your {positions.length} positions stay on Main.
						</p>
					</ModalHeader>
					<ModalContent>
						<SubFields name={name} amount={amount} onName={setName} onAmount={setAmount} />
					</ModalContent>
					<ModalFooter>
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

	function lockProps(id: string) {
		return { live, open: open === id, onOpen: (next: boolean) => setOpen(next ? id : null), onPause: pause };
	}

	return (
		<div className="flex flex-col gap-2 pb-48">
			<PositionsTable
				closeAll={<Locked {...lockProps("all")} label="Close All" coin={null} />}
				action={(p) => (
					<span className="inline-flex items-center gap-1">
						{["Limit", "Market", "Reverse"].map((label) => (
							<Locked key={label} {...lockProps(`${p.coin}-${label}`)} label={label} coin={coinLabel(p.coin)} />
						))}
					</span>
				)}
			/>
		</div>
	);
}

interface LockedProps {
	live: boolean;
	open: boolean;
	onOpen: (open: boolean) => void;
	onPause: () => void;
	label: string;
	coin: string | null;
}

function Locked({ live, open, onOpen, onPause, label, coin }: LockedProps) {
	if (!live)
		return (
			<Button variant="secondary" intent="neutral" size="xs">
				{label}
			</Button>
		);
	return (
		<Popover open={open} onOpenChange={onOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="secondary"
						intent="neutral"
						size="xs"
						className={cn("text-fg-muted", open && "bg-control-hover text-fg")}
						aria-label={`${label} locked while Auto Trader is on`}
					/>
				}
			>
				<LockSimpleIcon className="size-3" weight="bold" />
				{label}
			</PopoverTrigger>
			<PopoverContent side="bottom" align="end" sideOffset={6} className="w-72 p-3">
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1">
						<span className="text-sm font-medium">{LOCK_TITLE}</span>
						<span className="text-xs text-fg-secondary">{lockBody(coin)}</span>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="ghost" intent="neutral" size="sm" onClick={() => onOpen(false)}>
							Keep it on
						</Button>
						<Button variant="filled" intent="neutral" size="sm" onClick={onPause}>
							Pause Auto Trader
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
