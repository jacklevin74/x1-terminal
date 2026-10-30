import { WalletIcon } from "@phosphor-icons/react";
export interface WalletInfo {
 icon: React.ComponentType<{ className?: string }>;
 description: string;
 popular?: boolean;
 priority?: number;
}
export const WALLET_INFO: Record<string, WalletInfo> = {
 phantom: { icon: WalletIcon, description: "Connect Phantom’s Ethereum account", popular: true, priority: 1 },
 x1: { icon: WalletIcon, description: "Account derived from your X1 signature", popular: true, priority: 2 },
};
