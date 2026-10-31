import { connectSolSource, getSolSourceWallet } from "@/lib/solana/source-wallet";
import { readNativeEthereumRecipient } from "./native-ethereum";
import { isSolDepositAddress } from "@/lib/unit/sol-deposit";
export interface WithdrawalRecipient { address: string; status: "ready" | "locked" | "unavailable" | "manual"; message?: string }
const lockedMessage = "Your wallet is locked or disconnected. Unlock it, then reconnect to load your withdrawal address.";
export async function readWithdrawalRecipient(asset: "SOL" | "ETH", connectorId?: string, requestAccess = false): Promise<WithdrawalRecipient> {
 if (asset === "ETH") {
  const native = await readNativeEthereumRecipient(requestAccess);
  if (native.status === "ready" || native.status === "locked" || connectorId !== "x1") return native;
 }
 if (!connectorId) return { address: "", status: "unavailable", message: "Connect your wallet to load your withdrawal address." };
 if (asset === "SOL" || connectorId === "x1") {
  const kind = connectorId === "x1" ? "x1" : "phantom";
  const wallet = getSolSourceWallet(kind);
  if (!wallet) return { address: "", status: "unavailable", message: `Open your ${kind === "x1" ? "X1" : "Phantom"} wallet to connect its Solana account.` };
  try {
   const connected = requestAccess ? await connectSolSource(kind, wallet, true) : undefined;
   const address = connected?.toBase58() ?? wallet.publicKey?.toBase58() ?? "";
   if (wallet.connected === false || wallet.isConnected === false || !isSolDepositAddress(address)) return { address: "", status: "locked", message: lockedMessage };
   if (asset === "ETH") return { address: "", status: "manual", message: "Your connected X1 wallet provides a Solana address. Enter an Ethereum mainnet recipient address, or connect an Ethereum wallet to fill it automatically." };
   return { address, status: "ready" };
  } catch { return { address: "", status: "locked", message: lockedMessage }; }
 }
 return readNativeEthereumRecipient(requestAccess);
}
