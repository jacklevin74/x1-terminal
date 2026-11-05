import { useEffect, useRef } from "react";
import { szDecimalsToPriceDecimals } from "@/lib/format";
import { toFixed, toNumberOrZero } from "@/lib/trade/numbers";

interface MidSource {
	midPx?: string | null;
	markPx?: string | null;
}

export function getMidPx(market: MidSource | null | undefined): number {
	return toNumberOrZero(market?.midPx) || toNumberOrZero(market?.markPx);
}

const lastMarketByForm = new Map<string, string | undefined>();

interface Params {
	form: string;
	marketName: string | undefined;
	midPx: number;
	szDecimals: number | undefined;
	active: boolean;
	value: string;
	setValue: (value: string) => void;
}

export function useDefaultLimitPrice({ form, marketName, midPx, szDecimals, active, value, setValue }: Params) {
	const seededFor = useRef<string | null>(null);

	useEffect(() => {
		if (marketName && lastMarketByForm.get(form) !== marketName) {
			const hadMarket = lastMarketByForm.has(form);
			lastMarketByForm.set(form, marketName);
			seededFor.current = null;
			if (hadMarket && value) {
				setValue("");
				return;
			}
		}
		if (!active || !marketName) {
			seededFor.current = null;
			return;
		}
		if (seededFor.current === marketName) return;
		if (value) {
			seededFor.current = marketName;
			return;
		}
		if (!(midPx > 0)) return;
		seededFor.current = marketName;
		setValue(toFixed(midPx, szDecimalsToPriceDecimals(szDecimals ?? 4)));
	}, [form, active, marketName, midPx, szDecimals, value, setValue]);
}
