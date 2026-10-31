import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const AccountToolbarContext = createContext<{ target: HTMLElement | null; activeTab: string } | undefined>(undefined);
export function AccountTableToolbar({ tab, children }: { tab: string; children: ReactNode }) {
 const context = useContext(AccountToolbarContext);
 const controls = <div className="flex h-8 shrink-0 items-center justify-end gap-3 whitespace-nowrap text-xs [&_select]:max-w-32 [&_select]:py-0 [&_select]:text-xs">{children}</div>;
 if (!context) return controls;
 if (context.activeTab !== tab || !context.target) return null;
 return createPortal(controls, context.target);
}
