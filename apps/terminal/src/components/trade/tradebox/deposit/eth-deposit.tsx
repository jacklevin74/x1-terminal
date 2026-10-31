import { formatDepositAddressError } from "@/lib/jurisdiction";
import { NativeDepositIntro } from "./native-deposit-intro";
import { Button, TextInput } from "@hypeterminal/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { mainnet } from "wagmi/chains";
import { useConnection, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { fetchEthDepositAddress, fetchEthDepositFees, MIN_ETH_DEPOSIT, parseEthDepositAmount } from "@/lib/unit/eth-deposit";
import { useIsTestnet } from "@/stores/use-global-settings-store";

export function EthDeposit() {
 const { address } = useConnection();
 const testnet = useIsTestnet();
 if (!address) return <p className="text-sm py-4">Connect Phantom or X1 Wallet to generate an ETH deposit address.</p>;
 if (testnet) return <p className="text-sm py-4">Native ETH deposits are available on mainnet. Switch the terminal to mainnet to continue.</p>;
 // Remount on account change so address, amount, and transaction state cannot carry over.
 return <EthDepositAccount key={address} recipient={address} />;
}

function EthDepositAccount({ recipient }: { recipient: `0x${string}` }) {
 const { connector, chainId } = useConnection();
 const { mutateAsync: switchChain, isPending: switching } = useSwitchChain();
 const { mutateAsync: send, data: hash, isPending: sending, error: sendError } = useSendTransaction();
 const receipt = useWaitForTransactionReceipt({ hash, chainId: mainnet.id, query: { enabled: !!hash } });
 const [amount, setAmount] = useState("");
 const [error, setError] = useState<string | null>(null);
 const [copied, setCopied] = useState(false);
 const depositAddress = useQuery({ queryKey: ["unit-eth-deposit", "mainnet", recipient], queryFn: ({ signal }) => fetchEthDepositAddress(recipient, signal), staleTime: 300_000, retry: false });
 const fees = useQuery({ queryKey: ["unit-eth-fees", "mainnet"], queryFn: ({ signal }) => fetchEthDepositFees(signal), staleTime: 30_000, refetchInterval: 30_000, retry: false });

 async function sendEth() {
  setError(null);
  try {
   if (!depositAddress.data) throw new Error("Wait for a verified deposit address.");
   if (connector?.id !== "phantom") throw new Error("Use an Ethereum wallet to send ETH to the displayed address.");
   const value = parseEthDepositAmount(amount);
   if (chainId !== mainnet.id) await switchChain({ chainId: mainnet.id });
   await send({ account: recipient, to: depositAddress.data, value, chainId: mainnet.id });
  } catch (e) { setError(e instanceof Error ? e.message : "ETH transfer failed."); }
 }
 return <div className="space-y-3 text-sm">
  <NativeDepositIntro asset="ETH" chain="Ethereum" fee={fees.data?.fee} eta={fees.data?.eta} />
  {depositAddress.isPending && <p role="status">Generating and verifying your deposit address…</p>}
  {depositAddress.error && <div role="alert" className="text-error"><p>{formatDepositAddressError(depositAddress.error)}</p><Button size="sm" onClick={() => void depositAddress.refetch()}>Retry address</Button></div>}
  {depositAddress.data && <>
   <label className="block text-xs">Ethereum ETH deposit address</label>
   <div className="font-mono text-xs break-all rounded border border-stroke-weak p-3">{depositAddress.data}</div>
   <Button variant="outline" size="sm" className="w-full" onClick={async () => { try { await navigator.clipboard.writeText(depositAddress.data); setCopied(true); } catch { setError("Could not copy. Select the address above to copy it manually."); } }}>{copied ? "Copied" : "Copy ETH deposit address"}</Button>
   <p className="text-xs text-fg-muted">You can send from another Ethereum wallet or exchange to this address. It credits the Hyperliquid account shown above.</p>
  </>}

  {connector?.id === "phantom" && depositAddress.data && !hash && <>
   <label htmlFor="eth-deposit-amount" className="block text-xs">Amount (ETH)</label>
   <TextInput id="eth-deposit-amount" aria-label="ETH deposit amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Minimum ${MIN_ETH_DEPOSIT}`} disabled={sending || switching} />
   <Button variant="filled" intent="brand" className="h-11 w-full" onClick={() => void sendEth()} disabled={sending || switching || !amount}>{switching ? "Switching to Ethereum…" : sending ? "Confirm ETH transfer in Phantom…" : "Send ETH with Phantom"}</Button>
  </>}
  {(error || sendError || receipt.error) && <p role="alert" className="text-xs text-error">{formatDepositAddressError(error ?? sendError ?? receipt.error)}</p>}
  {hash && <p role="status" className="text-xs">{receipt.data?.status === "reverted" ? "Ethereum transfer reverted. No deposit was made." : receipt.isSuccess ? "Ethereum transfer confirmed. Unit is processing your deposit; check your ETH spot balance for arrival." : "Ethereum transfer submitted. Waiting for confirmation…"} <a href={`https://etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="underline">View transaction</a></p>}
  <p className="rounded-lg border border-stroke-error-strong/30 bg-error-soft/10 p-3 text-xs leading-relaxed text-error">Minimum deposit: {MIN_ETH_DEPOSIT} ETH. Send native ETH on Ethereum mainnet only. Other assets and deposits below the minimum cannot be credited.</p>
 </div>;
}
