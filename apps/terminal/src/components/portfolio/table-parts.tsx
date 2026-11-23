import { Avatar } from "@hypeterminal/ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { coinDex, coinIcon, coinName } from "@/lib/portfolio/format";
import type { TabId } from "@/lib/portfolio/model";

interface CoinProps {
	coin: string;
	side?: "long" | "short";
	chip?: string;
}

export function Coin({ coin, side, chip }: CoinProps) {
	const dex = coinDex(coin);
	return (
		<span className="inline-flex items-center gap-2">
			<Avatar size="xxs" src={coinIcon(coin)} initials={coinName(coin).slice(0, 1)} className="size-4" />
			<span className="text-fg">{coinName(coin)}</span>
			{chip && (
				<span
					className={cn(
						"rounded-4 px-1.5 py-0.5 text-2xs",
						side === "long" ? "bg-success-soft text-market-up" : "bg-error-soft text-market-down",
					)}
				>
					{chip}
				</span>
			)}
			{dex && <span className="rounded-4 bg-control px-1.5 py-0.5 text-2xs text-fg-muted">{dex}</span>}
		</span>
	);
}

interface EmptyProps {
	children: ReactNode;
}

export function Empty({ children }: EmptyProps) {
	return <div className="flex h-32 items-center justify-center px-3 text-xs text-fg-muted">{children}</div>;
}

export const FAILED_TEXT = "Could not load this list. It retries every 30 seconds.";

const EMPTY_TEXT: Record<TabId, string> = {
	balances: "No balances.",
	positions: "No open positions.",
	orders: "No open orders.",
	twap: "No active TWAPs.",
	history: "No trades yet.",
	funding: "No funding payments in the last 24 hours.",
	"orders-history": "No order history.",
	ledger: "No deposits or withdrawals.",
};

export function emptyText(tab: TabId) {
	return EMPTY_TEXT[tab];
}

const SKELETON_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-2/5", "w-3/5"];

interface SkeletonProps {
	height: "h-8" | "h-14";
}

export function SkeletonRows({ height }: SkeletonProps) {
	return (
		<output aria-live="polite" className="flex flex-col py-1">
			<span className="sr-only">Loading</span>
			{SKELETON_WIDTHS.map((width) => (
				<span key={width} aria-hidden="true" className={cn("flex shrink-0 items-center px-3", height)}>
					<span className={cn("h-3 rounded-4 bg-control animate-pulse motion-reduce:animate-none", width)} />
				</span>
			))}
		</output>
	);
}
