import { APP_HEADER_HEIGHT_CLASS } from "@/config/layout";
import { cn } from "@/lib/cn";
import { UserMenu } from "../header/user-menu";
import X1TerminalLogo from "../header/x1-terminal-logo";
import { MobileNavDrawer } from "./mobile-nav-drawer";

interface Props {
	className?: string;
}

export function MobileHeader({ className }: Props) {
	return (
		<header className={cn("pt-[env(safe-area-inset-top)]", "sticky top-0 z-40 bg-surface", className)}>
			<div
				className={cn(
					APP_HEADER_HEIGHT_CLASS,
					"box-border pl-4 pr-2 flex items-center justify-between gap-3 border-b border-stroke-weak",
				)}
			>
				<X1TerminalLogo />
				<div className="flex shrink-0 items-center gap-1">
					<UserMenu />
					<MobileNavDrawer />
				</div>
			</div>
		</header>
	);
}
