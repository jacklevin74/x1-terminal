import { WalletIcon } from "@phosphor-icons/react";
import { RabbyIcon } from "@/components/icons/rabby-icon";
export interface WalletInfo {
	icon: React.ComponentType<{ className?: string }>;
	description: string;
	popular?: boolean;
	priority?: number;
}
export const WALLET_INFO: Record<string, WalletInfo> = {
	rabby: {
		icon: RabbyIcon,
		description: "Connect Rabby, including Ledger hardware accounts",
		popular: true,
		priority: 0,
	},
	phantom: { icon: WalletIcon, description: "Connect Phantom’s Ethereum account", popular: true, priority: 1 },
};
