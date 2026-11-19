import { connectSolSource, getSolSourceWallet } from "@/lib/solana/source-wallet";
import { isSolDepositAddress } from "@/lib/unit/sol-deposit";
import { readNativeEthereumRecipient } from "./native-ethereum";
export interface WithdrawalRecipient {
	address: string;
	status: "ready" | "locked" | "unavailable" | "manual";
	message?: string;
}
const lockedMessage =
	"Your wallet is locked or disconnected. Unlock it, then reconnect to load your withdrawal address.";
export async function readWithdrawalRecipient(
	asset: "SOL" | "ETH",
	connectorId?: string,
	requestAccess = false,
): Promise<WithdrawalRecipient> {
	if (asset === "ETH") return readNativeEthereumRecipient(requestAccess, connectorId);
	if (!connectorId)
		return { address: "", status: "unavailable", message: "Connect your wallet to load your withdrawal address." };
	const wallet = getSolSourceWallet("phantom");
	if (!wallet)
		return { address: "", status: "unavailable", message: "Open your Phantom wallet to connect its Solana account." };
	try {
		const connected = requestAccess ? await connectSolSource("phantom", wallet, true) : undefined;
		const address = connected?.toBase58() ?? wallet.publicKey?.toBase58() ?? "";
		if (wallet.connected === false || wallet.isConnected === false || !isSolDepositAddress(address))
			return { address: "", status: "locked", message: lockedMessage };
		return { address, status: "ready" };
	} catch {
		return { address: "", status: "locked", message: lockedMessage };
	}
}
