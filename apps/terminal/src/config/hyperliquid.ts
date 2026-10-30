import { isAddress, zeroAddress } from "viem";
import type { BuilderConfig } from "@/lib/hyperliquid";
const address = import.meta.env.VITE_BUILDER_ADDRESS?.trim();
export const BUILDER_CONFIGURED = !!address && isAddress(address) && address.toLowerCase() !== zeroAddress;
export const DEFAULT_BUILDER_CONFIG: BuilderConfig = {
 b: BUILDER_CONFIGURED ? address.toLowerCase() as `0x${string}` : zeroAddress,
 f: 50,
};
