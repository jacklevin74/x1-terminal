import { cn } from "@/lib/cn";
import { OrdersHistoryTab } from "../positions/orders-history-tab";

interface Props {
	className?: string;
}
export function MobileOrdersHistoryTab({ className }: Props) {
	return (
		<div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
			<OrdersHistoryTab />
		</div>
	);
}
