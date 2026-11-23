import { CaretDownIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { type Account, short } from "../sub-accounts/data";

interface Props {
	children: ReactNode;
}

export function Frame({ children }: Props) {
	return (
		<div
			className="relative h-[640px] w-[640px] flex-none overflow-hidden rounded-8 font-sans text-fg"
			style={{
				backgroundImage: "url(/dev-refs/sub-accounts/terminal.png)",
				backgroundSize: "1512px 900px",
				backgroundPosition: "right top",
			}}
		>
			<div className="absolute top-1 right-12 h-10 w-80 bg-background" />
			{children}
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

export function Trigger({ active, open, onClick }: TriggerProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex h-8 items-center gap-2 rounded-8 bg-control px-3 text-xs tabular-nums transition-colors hover:bg-control-hover",
				open && "bg-control-hover",
			)}
		>
			{!active.master && <span className="text-fg-muted">{active.name}</span>}
			<span>{short(active.address)}</span>
			<CaretDownIcon weight="bold" className={cn("size-3 text-fg-muted transition-transform", open && "rotate-180")} />
		</button>
	);
}
