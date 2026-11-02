import { Badge, ButtonIcon } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { CheckIcon, LightningIcon, SpinnerGapIcon, XIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { ORDER_TOAST_SUCCESS_DURATION_MS } from "@/config/time";
import { cn } from "@/lib/cn";
import type { OrderOutcome } from "@/lib/trade/extract-order-status";
import { type OrderQueueItem, useOrderQueue, useOrderQueueActions } from "@/stores/use-order-queue-store";

const ORDER_TOAST_WIDTH = "w-80";
const ORDER_TOAST_LIST_MAX_HEIGHT = "max-h-72";

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

function getOrderTypeLabel(orderType: OrderQueueItem["orderType"]): string | null {
	switch (orderType) {
		case "trigger":
			return "Trigger";
		case "scale":
			return "Scale";
		case "twap":
			return "TWAP";
		default:
			return null;
	}
}

function getOutcomeLabel(outcome: OrderOutcome): string {
	switch (outcome) {
		case "filled":
			return t`Filled`;
		case "resting":
			return t`Placed`;
		case "triggerSet":
			return t`Set`;
		case "twapStarted":
			return t`Running`;
	}
}

function OrderItem({ order, onRemove }: { order: OrderQueueItem; onRemove: () => void }) {
	useAutoRemove(order, onRemove);

	const sideColor = order.side === "buy" ? "text-market-up" : "text-market-down";
	const orderTypeLabel = getOrderTypeLabel(order.orderType);
	const hasTpSl = order.tpPrice || order.slPrice;

	return (
		<div className={cn("flex gap-3 px-3 py-2", order.status === "pending" && "animate-pulse")}>
			<div className="flex size-7 shrink-0 items-center justify-center rounded-8 bg-control">
				{order.status === "pending" && <SpinnerGapIcon className="size-4 animate-spin text-fg-muted" />}
				{order.status === "success" && <CheckIcon className="size-4 text-market-up" weight="bold" />}
				{order.status === "failed" && <XIcon className="size-4 text-market-down" weight="bold" />}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex min-h-6 items-center gap-2">
					{orderTypeLabel && (
						<Badge tone="neutral" size="sm" className="text-2xs uppercase tracking-micro">
							{orderTypeLabel}
						</Badge>
					)}
					<span className={cn("text-2xs font-medium uppercase tracking-micro", sideColor)}>{order.side}</span>
					<span className="text-xs font-medium text-fg">{order.market}</span>
					{order.status === "success" && order.outcome && (
						<span className={cn("text-xs", order.outcome === "filled" ? "text-market-up" : "text-fg-muted")}>
							{getOutcomeLabel(order.outcome)}
						</span>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted tabular-nums">
					<span>
						{t`Size`}: <span className="text-fg">{order.size}</span>
					</span>
					{order.price && (
						<span>
							@ <span className="text-fg">{order.price}</span>
						</span>
					)}
				</div>
				{hasTpSl && (
					<div className="flex items-center gap-2 text-xs text-fg-muted tabular-nums">
						{order.tpPrice && (
							<span>
								TP: <span className="text-market-up">{order.tpPrice}</span>
							</span>
						)}
						{order.slPrice && (
							<span>
								SL: <span className="text-market-down">{order.slPrice}</span>
							</span>
						)}
					</div>
				)}
				{order.error && <div className="text-xs text-market-down">{order.error}</div>}
			</div>

			{order.status === "failed" && (
				<ButtonIcon
					variant="ghost"
					intent="neutral"
					size="xs"
					onClick={onRemove}
					className="shrink-0 self-start"
					aria-label={t`Dismiss`}
				>
					<XIcon className="size-3.5" />
				</ButtonIcon>
			)}
		</div>
	);
}

function CountdownBar({ order }: { order: OrderQueueItem }) {
	if (order.status !== "success") return null;

	return (
		<div className="absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden bg-control">
			<div
				className="h-full bg-market-up animate-countdown"
				style={{ animationDuration: `${ORDER_TOAST_SUCCESS_DURATION_MS}ms` }}
			/>
		</div>
	);
}

export function OrderToast() {
	const orders = useOrderQueue();
	const { removeOrder } = useOrderQueueActions();
	if (orders.length === 0) return null;

	const pendingCount = orders.filter((o) => o.status === "pending").length;
	const failedCount = orders.filter((o) => o.status === "failed").length;

	return (
		<div
			className={cn(
				ORDER_TOAST_WIDTH,
				"fixed right-6 bottom-6 z-50 overflow-hidden rounded-12 bg-overlay font-sans shadow-menu",
				failedCount > 0 && pendingCount === 0 && "ring-1 ring-inset ring-market-down",
			)}
		>
			<div className="flex h-9 items-center justify-between border-b border-stroke-weak px-3">
				<div className="flex items-center gap-2">
					<LightningIcon className="size-3.5 text-fg-muted" />
					<span className="text-2xs font-medium uppercase tracking-micro text-fg">{t`Order Queue`}</span>
				</div>
				<div className="flex items-center gap-1">
					{pendingCount > 0 && (
						<Badge tone="neutral" size="sm">
							{pendingCount} {t`pending`}
						</Badge>
					)}
					{failedCount > 0 && (
						<Badge tone="error" size="sm">
							{failedCount} {t`failed`}
						</Badge>
					)}
				</div>
			</div>

			<div className={cn("divide-y divide-stroke-faint overflow-y-auto", ORDER_TOAST_LIST_MAX_HEIGHT)}>
				{orders.map((order) => (
					<div key={order.id} className="relative">
						<OrderItem order={order} onRemove={() => removeOrder(order.id)} />
						<CountdownBar order={order} />
					</div>
				))}
			</div>
		</div>
	);
}
