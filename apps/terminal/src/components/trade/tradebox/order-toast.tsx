import { t } from "@lingui/core/macro";
import { CheckIcon, SpinnerGapIcon, XIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { ORDER_TOAST_SUCCESS_DURATION_MS } from "@/config/time";
import { cn } from "@/lib/cn";
import { type OrderQueueItem, useOrderQueue, useOrderQueueActions } from "@/stores/use-order-queue-store";

const RING = 2 * Math.PI * 13;

function useAutoRemove(order: OrderQueueItem, onRemove: () => void) {
	useEffect(() => {
		if (order.status !== "success" || !order.completedAt) return;

		const elapsed = Date.now() - order.completedAt;
		const remaining = ORDER_TOAST_SUCCESS_DURATION_MS - elapsed;

		if (remaining <= 0) {
			onRemove();
			return;
		}

		const timer = setTimeout(onRemove, remaining);
		return () => clearTimeout(timer);
	}, [order.status, order.completedAt, onRemove]);
}

function typeLabel(o: OrderQueueItem): string | null {
	switch (o.orderType) {
		case "trigger":
			return t`Trigger`;
		case "scale":
			return t`Scale`;
		case "twap":
			return "TWAP";
		default:
			return null;
	}
}

function outcomeWord(o: OrderQueueItem): string {
	if (o.status === "pending") return t`Sending`;
	if (o.status === "failed") return t`Failed`;
	switch (o.outcome) {
		case "filled":
			return t`Filled`;
		case "resting":
			return t`Placed`;
		case "triggerSet":
			return t`Set`;
		case "twapStarted":
			return t`Running`;
		default:
			return t`Done`;
	}
}

function verb(o: OrderQueueItem) {
	const buy = o.side === "buy";
	if (o.status === "pending") return buy ? t`Buying` : t`Selling`;
	if (o.status === "failed") return buy ? t`Buy` : t`Sell`;
	if (o.outcome === "filled") return buy ? t`Bought` : t`Sold`;
	return buy ? t`Buy` : t`Sell`;
}

function StatusRing({ o }: { o: OrderQueueItem }) {
	const done = o.status === "success";
	return (
		<span className="relative flex size-8 shrink-0 items-center justify-center">
			<svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90" aria-hidden="true">
				<circle cx="16" cy="16" r="13" fill="none" strokeWidth="2" className="stroke-control" />
				{done && (
					<circle
						cx="16"
						cy="16"
						r="13"
						fill="none"
						strokeWidth="2"
						strokeLinecap="round"
						strokeDasharray={RING}
						className="stroke-market-up animate-ring-drain"
						style={{ animationDuration: `${ORDER_TOAST_SUCCESS_DURATION_MS}ms`, ["--ring" as string]: RING }}
					/>
				)}
			</svg>
			{o.status === "pending" && <SpinnerGapIcon className="size-4 animate-spin text-fg-muted" />}
			{o.status === "success" && <CheckIcon className="size-4 text-market-up" weight="bold" />}
			{o.status === "failed" && <XIcon className="size-4 text-market-down" weight="bold" />}
		</span>
	);
}

function Pill({ o, onRemove }: { o: OrderQueueItem; onRemove: () => void }) {
	useAutoRemove(o, onRemove);
	const type = typeLabel(o);
	const failed = o.status === "failed";
	return (
		<div
			className={cn(
				"flex w-fit max-w-[min(360px,calc(100vw-48px))] items-center gap-3 rounded-full bg-black py-2 pr-5 pl-2 shadow-menu",
				failed && "rounded-[22px]",
			)}
		>
			<StatusRing o={o} />
			<div className="flex min-w-0 flex-col">
				<span className="truncate text-sm text-fg tabular-nums">
					{type && <span className="text-fg-muted">{type} </span>}
					{verb(o)} {o.size} {o.market}
					{o.price && (
						<span className="text-fg-muted">
							{" "}
							{t`at`} {o.price}
						</span>
					)}
				</span>
				{(o.tpPrice || o.slPrice) && (
					<span className="text-xs text-fg-muted tabular-nums">
						{o.tpPrice && <>TP {o.tpPrice} </>}
						{o.slPrice && <>SL {o.slPrice}</>}
					</span>
				)}
				{o.error && <span className="text-xs text-market-down">{o.error}</span>}
			</div>
			<span
				className={cn(
					"ml-2 shrink-0 text-xs",
					o.outcome === "filled" && "text-market-up",
					failed && "text-market-down",
					!failed && o.outcome !== "filled" && "text-fg-muted",
				)}
			>
				{outcomeWord(o)}
			</span>
			{failed && (
				<button
					type="button"
					onClick={onRemove}
					aria-label={t`Dismiss`}
					className="-mr-2 flex size-6 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-control hover:text-fg"
				>
					<XIcon className="size-3.5" />
				</button>
			)}
		</div>
	);
}

export function OrderToast() {
	const orders = useOrderQueue();
	const { removeOrder } = useOrderQueueActions();
	if (orders.length === 0) return null;

	return (
		<div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2 font-sans" aria-live="polite">
			{orders.map((o) => (
				<Pill key={o.id} o={o} onRemove={() => removeOrder(o.id)} />
			))}
		</div>
	);
}
