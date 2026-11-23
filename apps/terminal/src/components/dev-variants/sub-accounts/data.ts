// Sub-accounts round. Trader names and addresses are a real snapshot of the
// Hyperliquid leaderboard (traders.json, week window, captured 2026-11-18).
// Account balances, sub-account names and sub-account addresses are EXAMPLES.
//
// Hyperliquid actions each button maps to:
//   create:   exchange.createSubAccount({ name })              -> returns the new sub-account address
//   transfer: exchange.subAccountTransfer({ subAccountUser, isDeposit, usd })
//             isDeposit true = master -> sub, false = sub -> master, usd in micro USDC (1 USDC = 1e6)
//             sub -> sub has no single action: it is two transfers through the master.
//   switch:   no exchange action. Local select in useTradingAccountStore (as in user-menu.tsx).
//   bot:      auto-trader start/stop for the active account (existing Auto flow).
import { useState } from "react";
import { toast } from "sonner";
import raw from "./traders.json";

export interface Trader {
	rank: number;
	address: string;
	name: string;
	accountValue: number;
	pnl: number;
}

export const traders = (raw as { traders: Trader[] }).traders;

export type Mode =
	| { kind: "manual" }
	| { kind: "basket"; markets: string[] }
	| { kind: "copy"; trader: Trader; bias: "bullish" | "bearish" };

export interface Account {
	id: string;
	name: string;
	address: string;
	master: boolean;
	balance: number;
	mode: Mode;
}

export const BASKET = ["BTC", "ETH", "SOL", "HYPE", "XRP", "DOGE", "SUI", "ENA"];
export const OWNER = "0x8b3e4a0c5d2f9e71a6c04b2d13f8e5a9c7b241d6";

export const initialAccounts: Account[] = [
	{ id: "master", name: "Main account", address: OWNER, master: true, balance: 24180.52, mode: { kind: "manual" } },
	{
		id: "s1",
		name: "Bull whale",
		address: "0x3f2a6d81c0e94b57a2d8f61e0b9c3a4d5e7f91c4",
		master: false,
		balance: 5000,
		mode: { kind: "copy", trader: traders[0], bias: "bullish" },
	},
	{
		id: "s2",
		name: "Bear whale",
		address: "0x91d07c3be5a24f68d1e9b0a37c2f4e85d6a1b02e",
		master: false,
		balance: 3000,
		mode: { kind: "copy", trader: traders[1], bias: "bearish" },
	},
	{
		id: "s3",
		name: "Basket",
		address: "0x5c8e2b1f7a0d43e9b6c5a12f8d7e0b3c9a4f6e71",
		master: false,
		balance: 1250,
		mode: { kind: "basket", markets: BASKET },
	},
];

export function modeLabel(mode: Mode) {
	if (mode.kind === "manual") return "Manual";
	if (mode.kind === "basket") return "Auto basket";
	return `Copying ${mode.trader.name}`;
}

export function usd(n: number, dp = 2) {
	return `$${n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

export function short(address: string) {
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function compactUsd(n: number) {
	if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
	if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
	return usd(n);
}

function fakeAddress(seed: number) {
	const hex = Array.from({ length: 40 }, (_, i) => ((seed * 7 + i * 13) % 16).toString(16)).join("");
	return `0x${hex}`;
}

export function useAccounts(initialActive = "master") {
	const [accounts, setAccounts] = useState(initialAccounts);
	const [activeId, setActiveId] = useState(initialActive);
	const active = accounts.find((a) => a.id === activeId) ?? accounts[0];

	function create(name: string, opts?: { mode?: Mode; fund?: number; select?: boolean }) {
		const trimmed = name.trim();
		if (!trimmed || trimmed.length > 16) {
			toast.error("Use a name from 1 to 16 characters.");
			return null;
		}
		// exchange.createSubAccount({ name: trimmed })
		const id = `s${accounts.length + 1}-${Date.now()}`;
		const fund = Math.min(opts?.fund ?? 0, accounts[0].balance);
		const next: Account = {
			id,
			name: trimmed,
			address: fakeAddress(accounts.length + 3),
			master: false,
			balance: fund,
			mode: opts?.mode ?? { kind: "manual" },
		};
		setAccounts((list) => [...list.map((a) => (a.master ? { ...a, balance: a.balance - fund } : a)), next]);
		toast.success(`Sub-account "${trimmed}" created`);
		if (fund > 0) toast.success(`Moved ${usd(fund)} to ${trimmed}`);
		if (opts?.select) {
			setActiveId(id);
			toast(`Trading as ${trimmed}`);
		}
		return next;
	}

	function transfer(fromId: string, toId: string, amount: number) {
		const from = accounts.find((a) => a.id === fromId);
		const to = accounts.find((a) => a.id === toId);
		if (!from || !to || fromId === toId) return false;
		if (!(amount > 0)) {
			toast.error("Enter an amount.");
			return false;
		}
		if (amount > from.balance) {
			toast.error(`${from.name} has ${usd(from.balance)} available.`);
			return false;
		}
		// master -> sub: exchange.subAccountTransfer({ subAccountUser: to.address, isDeposit: true, usd: amount * 1e6 })
		// sub -> master: exchange.subAccountTransfer({ subAccountUser: from.address, isDeposit: false, usd: amount * 1e6 })
		// sub -> sub: both calls above, through the master.
		setAccounts((list) =>
			list.map((a) => {
				if (a.id === fromId) return { ...a, balance: a.balance - amount };
				if (a.id === toId) return { ...a, balance: a.balance + amount };
				return a;
			}),
		);
		toast.success(`Moved ${usd(amount)} from ${from.name} to ${to.name}`);
		return true;
	}

	function switchTo(id: string) {
		const next = accounts.find((a) => a.id === id);
		if (!next || id === activeId) return;
		// useTradingAccountStore.select(next.master ? null : { owner, network, address: next.address, name: next.name })
		setActiveId(id);
		toast(`Trading as ${next.name}`);
	}

	return { accounts, active, activeId, create, transfer, switchTo };
}

export type AccountsApi = ReturnType<typeof useAccounts>;
