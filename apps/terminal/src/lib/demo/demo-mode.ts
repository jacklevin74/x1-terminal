import type { Address } from "viem";

const STORAGE_KEY = "x1-terminal:demo-address";

export const DEFAULT_DEMO_ADDRESS: Address = "0x5fa3968b8f255076d1e23ae755fd93222e509627";

function isAddress(value: string): value is Address {
	return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function readParam(): string | null {
	return new URLSearchParams(window.location.search).get("demo");
}

export function getDemoAddress(): Address | null {
	if (!import.meta.env.DEV || typeof window === "undefined") return null;
	try {
		const param = readParam();
		if (param === "off") {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}
		if (param !== null) {
			const address = isAddress(param) ? param : DEFAULT_DEMO_ADDRESS;
			localStorage.setItem(STORAGE_KEY, address);
			return address;
		}
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored && isAddress(stored) ? stored : null;
	} catch {
		return null;
	}
}

export function exitDemoMode() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {}
	const url = new URL(window.location.href);
	url.searchParams.delete("demo");
	window.location.assign(url.toString());
}
