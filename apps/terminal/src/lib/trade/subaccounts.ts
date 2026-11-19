/** Hyperliquid transfers use integer micro-USDC. Reject rather than round. */
export function subaccountTransferAmount(value: string): number {
	const text = value.trim();
	if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw Error("Enter a positive USDC amount with at most 6 decimal places.");
	const [whole, fraction = ""] = text.split(".");
	const units = BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, "0"));
	if (units <= 0n || units > BigInt(Number.MAX_SAFE_INTEGER))
		throw Error("Enter a positive amount within the supported transfer limit.");
	return Number(units);
}
export function subaccountName(value: string) {
	const name = value.trim();
	if (!name || name.length > 16) throw Error("Use a name from 1 to 16 characters.");
	return name;
}

/** Read only diagnostic text, never serialize the request or signing payload. */
export function subaccountActionError(error: unknown): string {
	const seen = new Set<unknown>(),
		parts: string[] = [];
	let current = error,
		signing = false,
		rejected = false;
	for (let i = 0; i < 8 && current && typeof current === "object" && !seen.has(current); i++) {
		seen.add(current);
		const e = current as {
			name?: string;
			message?: string;
			shortMessage?: string;
			details?: string;
			code?: number;
			cause?: unknown;
		};
		signing ||= e.name === "AbstractWalletError" || /Failed to sign typed data/i.test(e.message ?? "");
		rejected ||=
			e.code === 4001 ||
			e.code === 5000 ||
			/user rejected|user denied|request rejected/i.test(e.shortMessage ?? e.message ?? "");
		for (const value of [e.shortMessage, e.details, e.message?.split("\n")[0]])
			if (typeof value === "string" && value.trim() && !parts.includes(value.trim()))
				parts.push(value.trim().slice(0, 500));
		current = e.cause;
	}
	if (rejected) return "Wallet signature was rejected. No action was submitted to Hyperliquid.";
	const useful = parts.filter(
		(p) =>
			!/Failed to sign typed data with .* wallet|^Invalid parameters were provided to the RPC method\.?$|^An unknown RPC error occurred\.?$/i.test(
				p,
			),
	);
	const reason = useful.at(-1) ?? "Unlock and reconnect your owner wallet, then try again.";
	if (signing)
		return `Your wallet could not sign this action: ${reason} No action was submitted to Hyperliquid.${/ledger|blind signing|0x6a80|0x6985|0x6d00|0x5515/i.test(parts.join(" ")) ? " If using Ledger, unlock it, open the Ethereum app, and check the signing instructions shown by Rabby." : ""}`;
	return `${parts[0] ?? (typeof error === "string" ? error : "Request failed.")} Refresh accounts to verify the result before retrying. No automatic retry was sent.`;
}
