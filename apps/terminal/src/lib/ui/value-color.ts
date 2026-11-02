import { type Numeric, toNumber } from "@/lib/trade/numbers";

export function getValueColorClass(value: Numeric): "text-market-up" | "text-market-down" {
	const num = toNumber(value);
	return num !== null && num >= 0 ? "text-market-up" : "text-market-down";
}
