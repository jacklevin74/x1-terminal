import { MOBILE_BOTTOM_NAV_HEIGHT_PX } from "@/config/layout";
import { MOBILE_NAV_ITEMS, type MobileTab } from "@/config/nav";
import { cn } from "@/lib/cn";

const NAV_BADGE_MAX_COUNT = 99;

export type { MobileTab };

interface Props {
	activeTab: MobileTab;
	onTabChange: (tab: MobileTab) => void;
	badges?: Partial<Record<MobileTab, number>>;
	className?: string;
}

export function MobileBottomNav({ activeTab, onTabChange, badges, className }: Props) {
	return (
		<nav
			className={cn(
				"fixed inset-x-0 bottom-0 z-50 bg-surface border-t border-stroke-weak",
				"pb-[env(safe-area-inset-bottom)]",
				className,
			)}
			aria-label="Primary navigation"
		>
			<div className="flex items-stretch px-1">
				{MOBILE_NAV_ITEMS.map((item) => {
					const isActive = activeTab === item.id;
					const badgeCount = badges?.[item.id];
					const showBadge = typeof badgeCount === "number" && badgeCount > 0;
					const Icon = item.icon;

					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onTabChange(item.id)}
							style={{ minHeight: `${MOBILE_BOTTOM_NAV_HEIGHT_PX}px` }}
							className={cn(
								"flex-1 flex flex-col items-center justify-center gap-1 rounded-8 px-1",
								"text-xs transition-colors duration-150 ease-out motion-reduce:transition-none",
								"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-stroke-focus",
								isActive ? "text-fg font-medium" : "text-fg-muted hover:text-fg",
							)}
							aria-current={isActive ? "page" : undefined}
							aria-label={item.label}
						>
							<span className="relative">
								<Icon className="size-5" weight={isActive ? "fill" : "regular"} />
								{showBadge && (
									<span
										className={cn(
											"absolute -top-1 -right-3 min-w-4 h-4 px-1",
											"flex items-center justify-center",
											"rounded-4 text-2xs uppercase tracking-micro font-medium tabular-nums",
											"bg-control-hover text-fg",
										)}
									>
										{badgeCount > NAV_BADGE_MAX_COUNT ? `${NAV_BADGE_MAX_COUNT}+` : badgeCount}
									</span>
								)}
							</span>
							<span>{item.label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}

export function MobileBottomNavSpacer({ className }: { className?: string }) {
	return (
		<div
			style={{ height: `calc(${MOBILE_BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom))` }}
			className={cn("shrink-0", className)}
			aria-hidden="true"
		/>
	);
}
