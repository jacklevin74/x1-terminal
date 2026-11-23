import { Button, Modal, ModalContent, ModalFooter, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import {
	ArrowRightIcon,
	CaretDownIcon,
	CaretLeftIcon,
	LockSimpleIcon,
	RobotIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { cn } from "@/lib/cn";
import { coinLabel, LOCK_TITLE, lockBody, type Props, positions, SUB_DEFAULT_NAME, usd, WARNING } from "./data";
import { PositionsTable, SubFields, Surface } from "./parts";

export default function V3({ scene, mobile }: Props) {
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

	if (step === "sub")
		return (
			<Surface mobile={mobile} open={open} onClose={() => setOpen(false)}>
				<div key="sub" className="mood-fade-in">
					<ModalHeader divider={false} className="pb-0">
						<button
							type="button"
							onClick={() => setStep("warn")}
							className="-ml-1 flex w-fit items-center gap-1 rounded-6 px-1 text-xs text-fg-muted hover:text-fg"
						>
							<CaretLeftIcon className="size-3" weight="bold" />
							Back
						</button>
						<h2 className="text-base font-medium">New sub-account for Auto Trader</h2>
					</ModalHeader>
					<ModalContent className="flex flex-col gap-4">
						<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
							<div className="rounded-12 bg-control p-3">
								<div className="font-medium">Main</div>
								<div className="mt-0.5 text-2xs text-fg-muted">{positions.length} positions stay here</div>
							</div>
							<ArrowRightIcon className="size-3.5 text-fg-muted" />
							<div className="rounded-12 bg-control p-3">
								<div className="flex items-center gap-1.5 font-medium">
									<RobotIcon className="size-3.5" weight="fill" />
									<span className="truncate">{name || "Sub-account"}</span>
								</div>
								<div className="mt-0.5 text-2xs text-fg-muted tabular-nums">
									{Number(amount) ? `$${Number(amount).toLocaleString("en-US")} USDC` : "USDC you move"}
								</div>
							</div>
						</div>
						<SubFields name={name} amount={amount} onName={setName} onAmount={setAmount} />
					</ModalContent>
					<ModalFooter className="flex-col items-stretch">
						<Button
							variant="filled"
							intent="brand"
							size="md"
							disabled={!Number(amount) || !name.trim()}
							onClick={createSub}
						>
							Create and start Auto Trader
						</Button>
					</ModalFooter>
				</div>
			</Surface>
		);

	return (
		<Surface mobile={mobile} open={open} onClose={() => setOpen(false)}>
			<div key="warn" className="mood-fade-in">
				<ModalHeader divider={false} className="pb-0">
					<span className="grid size-9 place-items-center rounded-full bg-control text-warning">
						<WarningIcon className="size-4" weight="fill" />
					</span>
				</ModalHeader>
				<ModalContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<h2 className="text-base font-medium text-balance">{WARNING}</h2>
						<p className="text-xs text-fg-muted">Auto Trader runs the whole account it starts on.</p>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{positions.map((p) => {
							const long = p.szi > 0;
							return (
								<span
									key={p.coin}
									className="inline-flex h-8 items-center gap-1.5 rounded-full bg-control pr-3 pl-1.5 text-xs"
								>
									<AssetDisplay coin={p.coin} hideName iconClassName="size-5" />
									{coinLabel(p.coin)}
									<span className={cn("tabular-nums", long ? "text-market-up" : "text-market-down")}>
										{long ? "Long" : "Short"} {usd(p.ntl)}
									</span>
								</span>
							);
						})}
					</div>
				</ModalContent>
				<ModalFooter className="flex-col items-stretch">
					<Button variant="filled" intent="brand" size="md" onClick={proceed}>
						Continue
					</Button>
					<Button variant="secondary" intent="neutral" size="md" onClick={() => setStep("sub")}>
						Create a sub-account
					</Button>
				</ModalFooter>
			</div>
		</Surface>
	);
}

function LockedClose() {
	const [live, setLive] = useState(true);
	const [asking, setAsking] = useState<string | null | undefined>(undefined);

	function pause() {
		setAsking(undefined);
		setLive(false);
		toast.success("Auto Trader paused. You can close positions now.");
	}

	function closeButton(coin: string | null, label: string) {
		if (!live)
			return (
				<Button variant="secondary" intent="neutral" size="xs">
					{label}
					{coin && <CaretDownIcon className="size-3" />}
				</Button>
			);
		return (
			<Button
				variant="secondary"
				intent="neutral"
				size="xs"
				className="text-fg-muted"
				aria-label={`${label} locked while Auto Trader is on`}
				onClick={() => setAsking(coin)}
			>
				<LockSimpleIcon className="size-3" weight="fill" />
				{label}
			</Button>
		);
	}

	return (
		<>
			<PositionsTable
				closeAll={closeButton(null, "Close All")}
				action={(p) => closeButton(coinLabel(p.coin), "Close")}
			/>
			<Modal open={asking !== undefined} onOpenChange={(next) => !next && setAsking(undefined)}>
				<ModalPopup size="sm">
					<ModalHeader>
						<ModalTitle>{LOCK_TITLE}</ModalTitle>
					</ModalHeader>
					<ModalContent>
						<p className="text-sm text-fg-secondary">{lockBody(asking ?? null)}</p>
					</ModalContent>
					<ModalFooter className="grid grid-cols-2 gap-2">
						<Button variant="secondary" intent="neutral" size="md" onClick={() => setAsking(undefined)}>
							Keep it on
						</Button>
						<Button variant="filled" intent="neutral" size="md" onClick={pause}>
							Pause Auto Trader
						</Button>
					</ModalFooter>
				</ModalPopup>
			</Modal>
		</>
	);
}
