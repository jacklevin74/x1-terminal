import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

export const AccountToolbarContext = createContext<{ target: HTMLElement | null; activeTab: string } | undefined>(
	undefined,
);

interface Props {
	tab: string;
	children: ReactNode;
}

export function AccountTableToolbar({ tab, children }: Props) {
	const context = useContext(AccountToolbarContext);
	const controls = (
		<div className="flex h-9 shrink-0 items-center justify-end gap-3 whitespace-nowrap text-xs text-fg">{children}</div>
	);
	if (!context) return controls;
	if (context.activeTab !== tab || !context.target) return null;
	return createPortal(controls, context.target);
}
