import { Button, ModalContent, ModalFooter, ModalHeader } from "@hypeterminal/ui";
import { LockSimpleIcon, WarningIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { coinLabel, LOCK_TITLE, type Props, positions, SUB_DEFAULT_NAME, WARNING } from "./data";
import { PositionLine, PositionsTable, SubFields, Surface } from "./parts";

type Choice = "main" | "sub";

export default function V2({ scene, mobile }: Props) {
	if (scene === "close") return <LockedClose />;
	return <StartWarning initial={scene === "sub" ? "sub" : null} mobile={mobile} />;
}

function StartWarning({ initial, mobile }: { initial: Choice | null; mobile?: boolean }) {
	const [open, setOpen] = useState(true);
	const [choice, setChoice] = useState<Choice | null>(initial);
	const [name, setName] = useState(SUB_DEFAULT_NAME);
	const [amount, setAmount] = useState(initial === "sub" ? "5000" : "");

	function confirm() {
		setOpen(false);
		if (choice === "sub") {
			toast.success(
				`Sub-account ${name} created with $${Number(amount).toLocaleString("en-US")}. Auto Trader started there.`,
			);
			return;
		}
		toast.success("Auto Trader started on Main account");
	}

	const subReady = Number(amount) > 0 && name.trim().length > 0;

	return (
		<Surface mobile={mobile} open={open} onClose={() => setOpen(false)}>
			<ModalHeader>
				<h2 className="text-base font-medium">You have {positions.length} open positions</h2>
			</ModalHeader>
			<ModalContent className="flex flex-col gap-3">
				<p className="flex items-start gap-2 text-sm">
					<WarningIcon weight="fill" className="mt-0.5 size-4 flex-none text-warning" />
					{WARNING}
				</p>
				<div className="flex flex-col gap-3 rounded-12 bg-background p-3">
					{positions.map((p) => (
						<PositionLine key={p.coin} p={p} />
					))}
				</div>
				<Option on={choice === "main"} onPick={() => setChoice("main")} title="Continue">
					Start Auto Trader on Main account with these positions.
				</Option>
				<Option on={choice === "sub"} onPick={() => setChoice("sub")} title="Create a sub-account">
					Your positions stay on Main. Auto Trader runs in a new account with the USDC you move.
				</Option>
				{choice === "sub" && (
					<SubFields className="mood-fade-in" name={name} amount={amount} onName={setName} onAmount={setAmount} />
				)}
			</ModalContent>
			<ModalFooter className="grid grid-cols-2 gap-2">
				<Button variant="secondary" intent="neutral" size="md" onClick={() => setOpen(false)}>
					Cancel
				</Button>
				<Button
					variant="filled"
					intent="brand"
					size="md"
					disabled={choice === null || (choice === "sub" && !subReady)}
					onClick={confirm}
				>
					{choice === "sub" ? "Create and start" : "Continue"}
				</Button>
			</ModalFooter>
		</Surface>
	);
}

function Option({
	on,
	onPick,
	title,
	children,
}: {
	on: boolean;
	onPick: () => void;
	title: string;
	children: ReactNode;
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
				<span className="text-sm font-medium">{title}</span>
				<span className="text-xs text-fg-muted">{children}</span>
			</span>
		</button>
	);
}

function LockedClose() {
	const [live, setLive] = useState(true);

	function pause() {
		setLive(false);
		toast.success("Auto Trader paused. You can close positions now.");
	}
	function tell(coin: string | null) {
		toast(LOCK_TITLE, {
			id: "auto-guard-2-v2-lock",
			description: `Auto Trader will likely reopen ${coin ?? "positions"} right after a manual close.`,
			duration: 8000,
			action: { label: "Pause Auto Trader", onClick: pause },
		});
	}

	function rowButtons(coin: string) {
		return (
			<span className="inline-flex items-center gap-1">
				{live && <LockSimpleIcon className="mr-1 size-3.5 text-fg-muted" weight="fill" aria-hidden />}
				{["Limit", "Market", "Reverse"].map((label) => (
					<Button
						key={label}
						variant="secondary"
						intent="neutral"
						size="xs"
						className={cn(live && "text-fg-disabled hover:text-fg-muted")}
						aria-label={live ? `${label} locked while Auto Trader is on` : label}
						onClick={() => live && tell(coin)}
					>
						{label}
					</Button>
				))}
			</span>
		);
	}

	return (
		<PositionsTable
			closeAll={
				<Button
					variant="secondary"
					intent="neutral"
					size="xs"
					className={cn(live && "text-fg-disabled hover:text-fg-muted")}
					onClick={() => live && tell(null)}
				>
					{live && <LockSimpleIcon className="size-3" weight="fill" />}
					Close All
				</Button>
			}
			action={(p) => rowButtons(coinLabel(p.coin))}
		/>
	);
}
