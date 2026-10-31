import { OrdersHistoryTab } from "../positions/orders-history-tab";
import { cn } from "@/lib/cn";
interface Props { className?: string; }
export function MobileOrdersHistoryTab({ className }: Props) {
 return <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}><OrdersHistoryTab /></div>;
}
