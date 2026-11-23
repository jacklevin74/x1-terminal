import { CaretDownIcon, WalletIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { type Account, modeLabel, usd } from "./data";

interface Props {
	children: ReactNode;
}

interface FrameProps {
	children: ReactNode;
	account?: Account;
}

export function Frame({ children, account }: FrameProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth / 1512, el.clientHeight / 900)));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return (
		<div
			ref={ref}
			className="absolute inset-x-0 top-10 bottom-0 flex items-center justify-center overflow-hidden bg-background"
		>
			<div
				className="relative flex-none overflow-hidden font-sans text-fg"
				style={{
					width: 1512,
					height: 900,
					transform: `scale(${scale})`,
					backgroundImage: "url(/dev-refs/sub-accounts/terminal.png)",
					backgroundSize: "1512px 900px",
				}}
			>
				<div className="absolute top-1 right-12 h-10 w-80 bg-background" />
				{account && (
					<div className="absolute top-[660px] right-1 flex h-[210px] w-[345px] flex-col gap-3 rounded-8 bg-surface px-3 pt-3 text-xs">
						<span className="text-2xs tracking-micro text-fg-muted uppercase">Account</span>
						<Row label="Trading as" value={account.name} />
						<Row label="Account equity" value={usd(account.balance)} />
						<Row label="Mode" value={modeLabel(account.mode)} />
					</div>
				)}
				{children}
			</div>
		</div>
	);
}

export function HeaderSlot({ children }: Props) {
	return <div className="absolute top-2 right-[52px] z-30 flex items-center gap-2">{children}</div>;
}

interface TriggerProps {
	active: Account;
	open?: boolean;
	onClick?: () => void;
}

export function WalletTrigger({ active, open, onClick }: TriggerProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex h-8 items-center gap-2 rounded-8 bg-control px-3 text-xs tabular-nums transition-colors hover:bg-control-hover",
				open && "bg-control-hover",
			)}
		>
			<span className="grid size-[18px] place-items-center rounded-full bg-fill text-fg-inverse">
				<WalletIcon weight="fill" className="size-3" />
			</span>
			{!active.master && <span className="text-fg-muted">{active.name}</span>}
			<span>
				{active.address.slice(0, 6)}…{active.address.slice(-4)}
			</span>
			<CaretDownIcon weight="bold" className={cn("size-3 text-fg-muted transition-transform", open && "rotate-180")} />
		</button>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<span className="flex items-center justify-between">
			<span className="text-fg-muted">{label}</span>
			<span className="tabular-nums">{value}</span>
		</span>
	);
}
