import { STORAGE_KEYS } from "@/config/app";
export type Network = "mainnet" | "testnet";
export function getNetwork(): Network {
 if (typeof window !== "undefined") {
  try {
   const network = JSON.parse(localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS) ?? "null")?.state?.network;
   if (network === "mainnet" || network === "testnet") return network;
  } catch {}
 }
 return import.meta.env.VITE_HYPERLIQUID_TESTNET === "false" ? "mainnet" : "testnet";
}
export function isTestnet() { return getNetwork() === "testnet"; }
