import { Badge } from "@hypeterminal/ui";
import { useEffect, useMemo, useState } from "react";
import { CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { KIND_LABELS, marketSearchConfig } from "@/config/search";
import { formatPrice } from "@/lib/format";
import { type UnifiedMarketInfo, useMarketsInfo } from "@/lib/hyperliquid";
import { createSearcher } from "@/lib/search";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useCommandMenuActions, useCommandMenuOpen } from "@/stores/use-global-modal-store";
import { useMarketActions } from "@/stores/use-market-store";
import { AssetDisplay } from "./asset-display";

const COMMAND_DIALOG_MAX_WIDTH_CLASS = "sm:max-w-120";

export function CommandMenu() {
	const open = useCommandMenuOpen();
	const { open: openMenu, close } = useCommandMenuActions();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const { markets } = useMarketsInfo();

	const [query, setQuery] = useState("");
	const searcher = useMemo(() => createSearcher(markets, marketSearchConfig), [markets]);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				if (open) {
					close();
				} else {
					openMenu();
				}
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, close, openMenu]);

	const results = query ? searcher.search(query) : [];
	const displayItems = query ? results.map((r) => r.item) : markets;

	function handleSelect(market: UnifiedMarketInfo) {
		setSelectedMarket(scope, market.name);
		close();
		setQuery("");
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			close();
			setQuery("");
		}
	}

	return (
		<CommandDialog
			open={!!open}
			onOpenChange={handleOpenChange}
			title="Search Markets"
			description="Search for a market to trade"
			showCloseButton={false}
			shouldFilter={false}
			className={COMMAND_DIALOG_MAX_WIDTH_CLASS}
		>
			<CommandInput placeholder="Search markets..." value={query} onValueChange={setQuery} />
			<CommandList className="p-1">
				<CommandEmpty>No markets found.</CommandEmpty>
				{displayItems.map((market) => (
					<CommandItem
						key={`${market.kind}-${market.name}`}
						value={`${market.kind}-${market.name}`}
						onSelect={() => handleSelect(market)}
						className="flex items-center justify-between"
					>
						<AssetDisplay coin={market.name} iconClassName="size-5" className="gap-2" />
						<div className="ml-auto flex items-center gap-2">
							<span className="tabular-nums text-fg-secondary">
								{formatPrice(market.markPx, { szDecimals: market.szDecimals })}
							</span>
							<Badge tone="neutral" size="xs">
								{KIND_LABELS[market.kind]}
							</Badge>
						</div>
					</CommandItem>
				))}
			</CommandList>
		</CommandDialog>
	);
}
