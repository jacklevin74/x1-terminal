import { useState } from "react";
import { toast } from "sonner";
import { useConnection } from "wagmi";
import { autoTraderErrorMessage } from "@/lib/auto-trader/error-message";
import { useHyperliquidClients } from "@/lib/hyperliquid";
import { getNetwork } from "@/lib/network";
import { useOrderEntryActions } from "@/stores/use-order-entry-store";
import { useTradingAccountStore } from "@/stores/use-trading-account-store";

export function useAutoSubaccount() {
	const { address: owner } = useConnection();
	const { user } = useHyperliquidClients();
	const select = useTradingAccountStore((s) => s.select);
	const { resetForm } = useOrderEntryActions();
	const [busy, setBusy] = useState(false);

	async function create(rawName: string, amount: number) {
		if (busy) return false;
		const name = rawName.trim();
		if (!owner || !user) {
			toast.error("Connect and unlock your owner wallet to create a sub-account.");
			return false;
		}
		if (!name || name.length > 16) {
			toast.error("Use a sub-account name from 1 to 16 characters.");
			return false;
		}
		setBusy(true);
		const id = toast.loading("Signature 1 of 2: create the sub-account.");
		try {
			const created = await user.createSubAccount({ name });
			const address = created.response.data;
			let moved = true;
			try {
				toast.loading("Signature 2 of 2: move USDC to the sub-account.", { id });
				await user.subAccountTransfer({ subAccountUser: address, isDeposit: true, usd: Math.round(amount * 1e6) });
			} catch {
				moved = false;
			}
			select({ owner, network: getNetwork(), address, name });
			resetForm();
			const sum = `$${amount.toLocaleString("en-US")}`;
			if (moved) toast.success(`Sub-account ${name} created with ${sum}. Finish Auto Trader setup there.`, { id });
			else
				toast.error(`Sub-account ${name} created. The ${sum} transfer failed. Fund the sub-account to continue.`, {
					id,
				});
			return true;
		} catch (e) {
			toast.error(autoTraderErrorMessage(e), { id });
			return false;
		} finally {
			setBusy(false);
		}
	}

	return { busy, create };
}
