import { isAddress, zeroAddress } from "viem";
import type { BuilderConfig } from "@/lib/hyperliquid";
// Public X1 builder identity; an optional build override must still be valid.
export const X1_DEFAULT_BUILDER_ADDRESS = "0x95e1642b6c06e06e6ad9412a90e908dcb09f6c1a";
const address = import.meta.env.VITE_BUILDER_ADDRESS?.trim() || X1_DEFAULT_BUILDER_ADDRESS;
export const BUILDER_CONFIGURED = !!address && isAddress(address) && address.toLowerCase() !== zeroAddress;
export const DEFAULT_BUILDER_CONFIG: BuilderConfig = {
 b: BUILDER_CONFIGURED ? address.toLowerCase() as `0x${string}` : zeroAddress,
 f: 50,
};
