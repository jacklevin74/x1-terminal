import { useState } from "react";
import { toast } from "sonner";
import { autoTraderErrorMessage } from "@/lib/auto-trader/error-message";
import { formatUSD } from "@/lib/format";
import { useHyperliquidClients } from "@/lib/hyperliquid";

interface Target {
	address: `0x${string}`;
	name: string;
}

export function useSubaccountActions() {
	const { user } = useHyperliquidClients();
	const [busy, setBusy] = useState(false);

	async function run(job: (client: NonNullable<typeof user>) => Promise<unknown>, done: string) {
		if (busy) return false;
		if (!user) {
			toast.error("Connect and unlock your owner wallet first.");
			return false;
		}
		setBusy(true);
		const id = toast.loading("Confirm in your wallet.");
		try {
			await job(user);
			toast.success(done, { id });
			return true;
		} catch (e) {
			toast.error(autoTraderErrorMessage(e), { id });
			return false;
		} finally {
			setBusy(false);
		}
	}

	function create(rawName: string) {
		const name = rawName.trim();
		if (!name || name.length > 16) {
			toast.error("Use a name from 1 to 16 characters.");
			return Promise.resolve(false);
		}
		return run((client) => client.createSubAccount({ name }), `Sub-account "${name}" created`);
	}

	function transfer(sub: Target, toSub: boolean, amount: number) {
		if (!(amount > 0)) {
			toast.error("Enter an amount.");
			return Promise.resolve(false);
		}
		const from = toSub ? "Main account" : sub.name;
		const to = toSub ? sub.name : "Main account";
		return run(
			(client) =>
				client.subAccountTransfer({ subAccountUser: sub.address, isDeposit: toSub, usd: Math.round(amount * 1e6) }),
			`Moved ${formatUSD(amount)} from ${from} to ${to}`,
		);
	}

	return { busy, create, transfer };
}
