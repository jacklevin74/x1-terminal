export function NativeDepositIntro({ asset, chain, fee, eta }: { asset: "SOL" | "ETH"; chain: string; fee?: number; eta?: string }) {
 return <div className="space-y-3 pb-2 text-center">
  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-fill-weaker">
   {asset === "SOL" ? <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true"><defs><linearGradient id="sol-deposit-symbol" x2="1" y2="1"><stop stopColor="#a98bff"/><stop offset="1" stopColor="#50d8bd"/></linearGradient></defs><path fill="url(#sol-deposit-symbol)" d="M8 6h22l-6 5H2zm-6 8h22l6 5H8zm6 8h22l-6 5H2z"/></svg> : <svg viewBox="0 0 24 32" className="h-9 w-6 text-brand" fill="currentColor" aria-hidden="true"><path d="M12 0 1 17l11 6 11-6zm0 25L1 19l11 13 11-13z"/></svg>}
  </div>
  <h3 className="text-xl font-medium text-fg">Deposit {asset} from {chain}</h3>
  <p className="text-sm leading-relaxed text-fg-muted">{eta ? `Deposits should arrive in about ${eta}. ` : ""}Your deposit arrives in your Hyperliquid spot balance. This service is provided by <a href="https://app.hyperunit.xyz/support" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Unit</a>{fee !== undefined ? `, with an estimated processing fee of ${fee.toFixed(8)} ${asset}` : "; processing fees apply"}. Sending network fees are additional.</p>
 </div>;
}
