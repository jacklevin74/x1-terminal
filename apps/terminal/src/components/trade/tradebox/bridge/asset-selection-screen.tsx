import { Button } from "@hypeterminal/ui";
import { Trans } from "@lingui/react/macro";
import { SpinnerGapIcon, WalletIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { formatTokenBalance } from "@/lib/bridge/format";
import { cn } from "@/lib/cn";
import { formatUSD } from "@/lib/format";
import { type BridgeToken, useBridgeBalances } from "@/lib/lifi/use-balances";
import { PoweredByLiFi, StatusBadgeIcon, TokenIcon } from "./shared-ui";

const BRIDGE_ASSET_LIST_MAX_HEIGHT = "max-h-72";

interface TokenRowProps {
	token: BridgeToken;
	onSelect: (token: BridgeToken) => void;
}

function tokenRowStyle(isDust: boolean): string {
	if (isDust) return "cursor-not-allowed";
	return "cursor-pointer hover:bg-control active:bg-control-hover";
}

function TokenRow({ token, onSelect }: TokenRowProps) {
	return (
		<button
			type="button"
			disabled={token.isDust}
			onClick={() => onSelect(token)}
			className={cn(
				"flex min-h-12 w-full items-center gap-3 rounded-8 px-3 py-2 text-left transition-colors",
				tokenRowStyle(token.isDust),
			)}
		>
			<TokenIcon token={token} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5">
					<span className={cn("truncate text-xs font-medium", token.isDust ? "text-fg-disabled" : "text-fg")}>
						{token.symbol}
					</span>
					<span className={cn("truncate text-xs", token.isDust ? "text-fg-disabled" : "text-fg-muted")}>
						{token.chainName}
					</span>
				</div>
				{token.isDust ? (
					<span className="block truncate text-xs text-fg-disabled">
						<Trans>Low balance</Trans>
					</span>
				) : (
					<span className="block truncate text-xs text-fg-muted">{token.name}</span>
				)}
			</div>
			<div className="text-right shrink-0">
				<div className={cn("text-xs tabular-nums", token.isDust ? "text-fg-disabled" : "text-fg")}>
					{formatTokenBalance(token.amount, token.decimals)}
				</div>
				<div className={cn("text-xs tabular-nums", token.isDust ? "text-fg-disabled" : "text-fg-muted")}>
					{formatUSD(token.amountUSD, 2)}
				</div>
			</div>
		</button>
	);
}

function AssetSelectionLoading() {
	return (
		<div className="flex flex-col items-center gap-4 py-8">
			<SpinnerGapIcon className="size-6 animate-spin text-fg-muted" />
			<p className="text-xs text-fg-muted">
				<Trans>Loading balances across all chains...</Trans>
			</p>
		</div>
	);
}

function AssetSelectionError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-col items-center gap-4 py-8">
			<StatusBadgeIcon>
				<WarningCircleIcon className="size-6 text-market-down" />
			</StatusBadgeIcon>
			<div className="space-y-1 text-center">
				<p className="text-lg font-medium text-fg">
					<Trans>Failed to load balances</Trans>
				</p>
				<p className="text-xs text-fg-muted">
					<Trans>Could not fetch your token balances</Trans>
				</p>
			</div>
			<Button variant="secondary" intent="neutral" size="xs" onClick={onRetry}>
				<Trans>Try Again</Trans>
			</Button>
		</div>
	);
}

function AssetSelectionEmpty() {
	return (
		<div className="flex flex-col items-center gap-4 py-8">
			<StatusBadgeIcon>
				<WalletIcon className="size-6 text-fg-muted" />
			</StatusBadgeIcon>
			<div className="space-y-1 text-center">
				<p className="text-lg font-medium text-fg">
					<Trans>No balances found</Trans>
				</p>
				<p className="text-xs text-fg-muted">
					<Trans>No tokens with value found across supported chains</Trans>
				</p>
			</div>
		</div>
	);
}

interface Props {
	address: string;
	onSelect: (token: BridgeToken) => void;
}

export function AssetSelectionScreen({ address, onSelect }: Props) {
	const { data: tokens, isLoading, isError, refetch } = useBridgeBalances(address);

	if (isLoading) return <AssetSelectionLoading />;
	if (isError) return <AssetSelectionError onRetry={() => refetch()} />;
	if (!tokens || tokens.length === 0) return <AssetSelectionEmpty />;

	return (
		<div className="flex flex-1 flex-col">
			<div
				className={cn(
					BRIDGE_ASSET_LIST_MAX_HEIGHT,
					"-mx-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,black_88%,transparent_100%)]",
				)}
			>
				{tokens.map((token) => (
					<TokenRow key={`${token.chainId}-${token.address}`} token={token} onSelect={onSelect} />
				))}
			</div>
			<PoweredByLiFi />
		</div>
	);
}
