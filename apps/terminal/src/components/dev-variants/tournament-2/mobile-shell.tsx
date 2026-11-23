import { BellIcon, GearIcon, ListIcon, SunIcon, TerminalIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface Props {
	children: ReactNode;
}

export function MobileShell({ children }: Props) {
	return (
		<div className="dark flex h-dvh flex-col bg-background font-sans text-fg">
			<div className="flex h-12 flex-none items-center gap-2 bg-surface px-3">
				<ListIcon className="size-5 text-fg-secondary" />
				<span className="grid size-7 place-items-center rounded-6 bg-control">
					<TerminalIcon className="size-4 text-fg-secondary" />
				</span>
				<span className="ml-auto rounded-6 bg-control px-3 py-1.5 text-sm text-fg">Connect Wallet</span>
				<BellIcon className="ml-1 size-5 text-fg-secondary" />
				<SunIcon className="size-5 text-fg-secondary" />
				<GearIcon className="size-5 text-fg-secondary" />
			</div>
			<div className="min-h-0 flex-1">{children}</div>
		</div>
	);
}
