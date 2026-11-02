interface Props {
	asset: "SOL" | "ETH";
	chain: string;
	fee?: number;
	eta?: string;
}

export function NativeDepositIntro({ asset, chain, fee, eta }: Props) {
	return (
		<div className="space-y-3 text-center">
			<div className="mx-auto flex size-12 items-center justify-center rounded-8 bg-control text-fg">
				{asset === "SOL" ? (
					<svg viewBox="0 0 32 32" className="size-6" fill="currentColor" aria-hidden="true">
						<path d="M8 6h22l-6 5H2zm-6 8h22l6 5H8zm6 8h22l-6 5H2z" />
					</svg>
				) : (
					<svg viewBox="0 0 24 32" className="h-7 w-5" fill="currentColor" aria-hidden="true">
						<path d="M12 0 1 17l11 6 11-6zm0 25L1 19l11 13 11-13z" />
					</svg>
				)}
			</div>
			<h3 className="text-base font-medium text-fg">
				Deposit {asset} from {chain}
			</h3>
			<p className="text-xs text-fg-secondary">
				{eta ? `Deposits should arrive in about ${eta}. ` : ""}Your deposit arrives in your Hyperliquid spot balance.
				This service is provided by{" "}
				<a
					href="https://app.hyperunit.xyz/support"
					target="_blank"
					rel="noopener noreferrer"
					className="text-fg underline decoration-dashed underline-offset-4 transition-colors hover:text-fg-secondary"
				>
					Unit
				</a>
				{fee !== undefined
					? `, with an estimated processing fee of ${fee.toFixed(8)} ${asset}`
					: "; processing fees apply"}
				. Sending network fees are additional.
			</p>
		</div>
	);
}
