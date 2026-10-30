import { NativeDepositIntro } from "./native-deposit-intro";
import { readSolDepositBalance } from "@/lib/solana/deposit-balance";
import { formatSolLamports, getSolSourceWallet, type SolSourceKind } from "@/lib/solana/source-wallet";
import { Button } from "@hypeterminal/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useConnection } from "wagmi";
import { fetchSolDepositAddress, fetchSolDepositFees, MIN_SOL_DEPOSIT, parseSolDepositAmount } from "@/lib/unit/sol-deposit";
import { sendSolDeposit } from "@/lib/solana/phantom-deposit";
import { useIsTestnet } from "@/stores/use-global-settings-store";

export function SolDeposit({ compact = false }: { compact?: boolean }) {
 const { address } = useConnection();
 const testnet = useIsTestnet();
 if (!address) return <p className="text-sm py-4">Connect Phantom or X1 Wallet to generate a SOL deposit address.</p>;
 if (testnet) return <p className="text-sm py-4">Native SOL deposits are available on mainnet. Switch the terminal to mainnet to continue.</p>;
 return <SolDepositAccount key={address} recipient={address} compact={compact} />;
}
function SolDepositAccount({ recipient, compact }: { recipient: `0x${string}`; compact: boolean }) {
 const { connector, address } = useConnection();
 const active = useRef(true);
 const currentAccount = useRef(address);
 currentAccount.current = address;
 useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
 const sourceKind: SolSourceKind = connector?.id === "x1" ? "x1" : "phantom";
 const walletName = sourceKind === "x1" ? "X1 Wallet" : "Phantom";
 const [sourceAddress, setSourceAddress] = useState(() => getSolSourceWallet(sourceKind)?.publicKey?.toBase58() ?? "");
 useEffect(() => {
  const wallet = getSolSourceWallet(sourceKind);
  const update = () => setSourceAddress(wallet?.publicKey?.toBase58() ?? "");
  update();
  const dispose = wallet?.on?.("accountChanged", update);
  return () => {
   if (typeof dispose === "function") dispose();
   else if (wallet?.removeListener) wallet.removeListener("accountChanged", update);
   else wallet?.off?.("accountChanged", update);
  };
 }, [sourceKind]);
 const [amount, setAmount] = useState("");
 const [error, setError] = useState<string | null>(null);
 const [sending, setSending] = useState(false);
 const [signature, setSignature] = useState<string | null>(null);
 const [confirmed, setConfirmed] = useState(false);
 const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);
 const [copied, setCopied] = useState(false);
 const deposit = useQuery({ queryKey: ["unit-sol-deposit", "mainnet", recipient], queryFn: ({ signal }) => fetchSolDepositAddress(recipient, signal), staleTime: 300_000, retry: false });
 const fees = useQuery({ queryKey: ["unit-sol-fees", "mainnet"], queryFn: ({ signal }) => fetchSolDepositFees(signal), staleTime: 30_000, refetchInterval: 30_000, retry: false });

 function assertCurrentAccount() {
  if (!active.current || currentAccount.current !== recipient) throw new Error("Hyperliquid account changed. Reopen Deposit to continue.");
 }
 const balanceQuery = useQuery({
  queryKey: ["sol-wallet-balance", "mainnet", sourceKind, recipient, sourceAddress, deposit.data],
  queryFn: () => readSolDepositBalance(sourceKind, deposit.data!, assertCurrentAccount),
  enabled: !!deposit.data && (connector?.id === "x1" || connector?.id === "phantom"),
  retry: false, staleTime: 30_000, refetchOnWindowFocus: false,
 });
 const balance = balanceQuery.data;
 const readingBalance = balanceQuery.isFetching;

 let amountError: string | null = null;
 if (amount) {
  try {
   const value = parseSolDepositAmount(amount);
   if (balance && value > balance.maxLamports) amountError = "Leave enough SOL for network fees, or use Max.";
  } catch (e) { amountError = e instanceof Error ? e.message : "Invalid SOL amount."; }
 }
 async function send() {
  setError(null); setConfirmationNotice(null); setSending(true);
  try {
   if (!deposit.data) throw new Error("Wait for a verified SOL deposit address.");
   if (!balance) throw new Error("Wait for your SOL balance to load.");
   if (amountError) throw new Error(amountError);
   await sendSolDeposit(deposit.data, amount, hash => { if (active.current) setSignature(hash); }, assertCurrentAccount, { kind: sourceKind, expectedAddress: balance.address });
   if (active.current) setConfirmed(true);
  } catch (e) {
   if (active.current) {
    if (e instanceof Error && e.name === "SolDepositConfirmationPendingError") setConfirmationNotice(e.message);
    else setError(e instanceof Error ? e.message : "SOL transfer failed.");
   }
  }
  finally { if (active.current) setSending(false); }
 }
 return <div className="space-y-3 text-sm">
  {!compact && <NativeDepositIntro asset="SOL" chain="Solana" fee={fees.data?.fee} eta={fees.data?.eta} />}
  {deposit.isPending && <p role="status">Generating and verifying your SOL deposit address…</p>}
  {deposit.error && <div role="alert" className="text-error"><p>{deposit.error.message}</p><Button size="sm" onClick={() => void deposit.refetch()}>Retry address</Button></div>}
  {(connector?.id === "phantom" || connector?.id === "x1") && deposit.data && !signature && <>
   <div className="flex items-center justify-between gap-2 text-xs text-fg-muted">
    <span>{walletName}</span><span className="tabular-nums">{balance ? `Available: ${formatSolLamports(balance.lamports)} SOL` : balanceQuery.error ? "Balance unavailable" : "Loading balance…"}</span>
   </div>
   {balanceQuery.error && <p role="alert" className="text-xs text-error">{balanceQuery.error.message} <button type="button" className="underline" onClick={() => void balanceQuery.refetch()}>Retry</button></p>}
   <div className="flex h-12 items-center gap-3 rounded-lg border border-stroke-weak px-3">
    <label htmlFor="sol-deposit-amount" className="shrink-0 text-sm text-fg-muted">Amount</label>
    <input id="sol-deposit-amount" aria-label="SOL deposit amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={sending || !balance} className="min-w-0 flex-1 bg-transparent text-right text-sm text-fg outline-none disabled:opacity-40" />
    <button type="button" disabled={sending || !balance || readingBalance} onClick={() => { if (balance) setAmount(formatSolLamports(balance.maxLamports)); }} className="text-xs font-medium text-brand disabled:opacity-40">Max</button>
   </div>
   {amountError && <p role="alert" className="text-xs text-error">{amountError}</p>}
   <Button variant="filled" intent="brand" className="h-12 w-full" onClick={() => void send()} disabled={sending || readingBalance || !balance || !amount || !!amountError}>{sending ? "Confirm in wallet…" : "Deposit"}</Button>
  </>}
  {error && <p role="alert" className="text-xs text-error">{error}</p>}
  {signature && <p role="status" className="text-xs">{confirmationNotice ?? (confirmed ? "Solana transfer confirmed. Unit is processing your deposit; check your SOL spot balance for arrival." : "Solana transfer submitted. Check transaction status before retrying.")} <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noopener noreferrer" className="underline">View transaction</a></p>}
  {!compact && deposit.data && <details className="border-t border-stroke-weak pt-3 text-xs text-fg-muted">
   <summary className="cursor-pointer text-brand">Deposit from another wallet</summary>
   <div className="mt-2 space-y-2">
    <p>Send native SOL on Solana to this address:</p>
    <div className="break-all rounded bg-fill-weaker p-2 font-mono text-fg">{deposit.data}</div>
    <Button size="sm" variant="outline" className="w-full" onClick={async () => { try { await navigator.clipboard.writeText(deposit.data); setCopied(true); } catch { setError("Could not copy. Select the address to copy it manually."); } }}>{copied ? "Copied" : "Copy SOL deposit address"}</Button>
    <p className="break-all">Hyperliquid account: <span className="font-mono">{recipient}</span></p>
   </div>
  </details>}
  {!compact && <p className="rounded-lg border border-stroke-error-strong/30 bg-error-soft/10 p-3 text-xs leading-relaxed text-error">Minimum deposit: {MIN_SOL_DEPOSIT} SOL. Send native SOL on Solana mainnet only. Other assets and deposits below the minimum cannot be credited.</p>}
 </div>;
}
