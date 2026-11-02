import { Button, SearchInput, Tabs, TabsList, TabsTrigger } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { ArrowDownIcon, ArrowsDownUpIcon, ArrowUpIcon } from "@phosphor-icons/react";
import { flexRender } from "@tanstack/react-table";
import { cn } from "@/lib/cn";
import type { UnifiedMarketInfo } from "@/lib/hyperliquid";
import { useRenderCommitTrack } from "@/lib/performance/render-profile";
import { getMarketTableColumnClass, type MarketScope } from "./token-selector-columns";
import { TokenSelectorRow } from "./token-selector-row";
import type { useTokenSelector } from "./use-token-selector";

const LOADING_ROW_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"];

function getColumnSortLabel(columnId: string): string {
	switch (columnId) {
		case "price":
			return t`Price`;
		case "24h-change":
			return t`24h Change`;
		case "oi":
			return t`Open Interest`;
		case "volume":
			return t`Volume`;
		case "funding":
			return t`Funding`;
		default:
			return columnId;
	}
}

function SortIcon({ columnId, sorting }: { columnId: string; sorting: { id: string; desc: boolean }[] }) {
	const sort = sorting.find((s) => s.id === columnId);
	if (sort?.desc === false) return <ArrowUpIcon className="size-3 text-fg" />;
	if (sort?.desc === true) return <ArrowDownIcon className="size-3 text-fg" />;
	return <ArrowsDownUpIcon className="size-3 text-fg-muted" />;
}

interface Props {
	selectedMarket: UnifiedMarketInfo | undefined;
	scope: MarketScope;
	exchangeScope: string;
	exchangeDex: string | undefined;
	subcategory: string;
	subcategories: { value: string; label: string }[];
	search: string;
	setSearch: (value: string) => void;
	isLoading: boolean;
	isFavorite: (name: string) => boolean;
	sorting: { id: string; desc: boolean }[];
	handleSort: (columnId: string) => void;
	handleSelect: (name: string) => void;
	handleSubcategorySelect: (value: string) => void;
	handleScopeSelect: (value: MarketScope) => void;
	toggleFavorite: (name: string) => void;
	table: ReturnType<typeof useTokenSelector>["table"];
	rows: ReturnType<typeof useTokenSelector>["rows"];
	virtualItems: ReturnType<typeof useTokenSelector>["virtualItems"];
	totalSize: number;
	containerRef: React.RefCallback<HTMLDivElement>;
	filteredMarkets: ReturnType<typeof useTokenSelector>["filteredMarkets"];
	highlightedIndex: number;
	headingId: string;
	mobile?: boolean;
}

export function TokenSelectorContent({
	selectedMarket,
	scope,
	exchangeScope,
	exchangeDex,
	subcategory,
	subcategories,
	search,
	setSearch,
	isLoading,
	isFavorite,
	sorting,
	handleSort,
	handleSelect,
	handleSubcategorySelect,
	handleScopeSelect,
	toggleFavorite,
	table,
	rows,
	virtualItems,
	totalSize,
	containerRef,
	filteredMarkets,
	highlightedIndex,
	headingId,
	mobile,
}: Props) {
	useRenderCommitTrack("token-search");
	const headerGroup = table.getHeaderGroups()[0];
	const marketScopes: { value: MarketScope; label: string }[] = [
		{ value: "all", label: t`All` },
		{ value: "perp", label: t`Perp` },
		{ value: "spot", label: t`Spot` },
		{ value: "hip3", label: t`HIP-3` },
	];
	const showScopeTabs = exchangeScope === "all";
	const showSubcategoryTabs = !exchangeDex && subcategories.length > 0;

	const headerCellClass = "h-6 shrink-0 pl-2 text-2xs font-normal uppercase tracking-micro text-fg-muted";

	function handleScopeTabChange(value: unknown) {
		handleScopeSelect(value as MarketScope);
	}

	return (
		<div
			className={cn("flex flex-col", mobile ? "min-h-0 flex-1" : "max-h-[min(--spacing(144),var(--available-height))]")}
		>
			<div className="shrink-0 space-y-2 px-3 pt-3 pb-2">
				<h2 id={headingId} className="text-base font-medium text-fg">
					{t`Select market`}
				</h2>
				<SearchInput
					placeholder={t`Search markets...`}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					onClear={() => setSearch("")}
					size="sm"
					aria-labelledby={headingId}
				/>
			</div>

			{showScopeTabs ? (
				<Tabs value={scope} onValueChange={handleScopeTabChange} className="shrink-0">
					<TabsList className="px-3">
						{marketScopes.map((s) => (
							<TabsTrigger key={s.value} value={s.value}>
								{s.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			) : null}

			{showSubcategoryTabs ? (
				<div className="flex max-h-21 shrink-0 flex-wrap items-center gap-1 overflow-y-auto border-b border-stroke-weak px-3 py-2">
					{subcategories.map((sub) => {
						const isSelected = subcategory === sub.value;
						return (
							<Button
								key={sub.value}
								variant={isSelected ? "secondary" : "ghost"}
								intent="neutral"
								size="xxs"
								onClick={() => handleSubcategorySelect(sub.value)}
								className={isSelected ? "text-fg" : "text-fg-muted hover:text-fg"}
								aria-label={t`Filter by ${sub.label}`}
								aria-pressed={isSelected}
							>
								{sub.label}
							</Button>
						);
					})}
				</div>
			) : null}

			<div
				className={cn(
					"flex shrink-0 items-center bg-band pr-3 pl-1",
					!showSubcategoryTabs && !showScopeTabs && "border-t border-stroke-weak",
				)}
			>
				<span className={cn(headerCellClass, "flex min-w-0 flex-1 items-center pr-2")}>{t`Market`}</span>
				{headerGroup?.headers
					.filter((h) => h.id !== "pairName")
					.map((header) => {
						const hiddenOnMobile = ["oi", "volume", "funding"].includes(header.id);
						const hideForSpot = scope === "spot" && ["oi", "funding"].includes(header.id);

						if (hideForSpot) return null;

						const sortLabel = getColumnSortLabel(header.id);
						return (
							<button
								key={header.id}
								type="button"
								onClick={() => handleSort(header.id)}
								title={sortLabel}
								aria-label={t`Sort by ${sortLabel}`}
								className={cn(
									headerCellClass,
									"cursor-pointer items-center justify-end gap-1 whitespace-nowrap transition-colors hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-stroke-focus",
									getMarketTableColumnClass(header.id, mobile ?? false),
									hiddenOnMobile && !mobile ? "hidden sm:flex" : "flex",
									hiddenOnMobile && mobile && "hidden",
								)}
							>
								<span className="min-w-0 truncate">
									{flexRender(header.column.columnDef.header, header.getContext())}
								</span>
								<SortIcon columnId={header.id} sorting={sorting} />
							</button>
						);
					})}
			</div>

			<div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
				{isLoading ? (
					<div aria-busy="true">
						<span className="sr-only">{t`Loading markets...`}</span>
						{LOADING_ROW_KEYS.map((key) => (
							<div key={key} className="flex h-10 items-center gap-2 border-b border-stroke-faint px-3">
								<div className="size-5 shrink-0 animate-pulse rounded-4 bg-control" />
								<div className="h-3 w-24 animate-pulse rounded-4 bg-control" />
								<div className="ml-auto h-3 w-16 animate-pulse rounded-4 bg-control" />
							</div>
						))}
					</div>
				) : rows.length === 0 ? (
					<div className="py-8 text-center text-xs text-fg-muted">{t`No markets found.`}</div>
				) : (
					<div
						role="listbox"
						aria-label={t`Markets`}
						style={{
							height: `${totalSize}px`,
							width: "100%",
							position: "relative",
						}}
					>
						{virtualItems.map((virtualItem) => {
							const row = rows[virtualItem.index];
							const market = row.original;
							return (
								<TokenSelectorRow
									key={row.id}
									market={market}
									mobile={mobile ?? false}
									scope={scope}
									isSelected={selectedMarket?.name === market.name}
									isHighlighted={highlightedIndex >= 0 && virtualItem.index === highlightedIndex}
									isFavorite={isFavorite(market.name)}
									top={virtualItem.start}
									height={virtualItem.size}
									onSelect={handleSelect}
									onToggleFavorite={toggleFavorite}
								/>
							);
						})}
					</div>
				)}
			</div>

			<div className="flex h-8 shrink-0 items-center justify-between gap-4 border-t border-stroke-weak px-3 text-xs text-fg-muted">
				<span className="tabular-nums">
					{filteredMarkets.length} {t`markets`}
				</span>
				<span className="min-w-0 truncate text-right">
					{sorting.length > 0 ? t`Sorted by ${getColumnSortLabel(sorting[0].id)}` : t`Updated live`}
				</span>
			</div>
		</div>
	);
}
