export function hasUnifiedSpotBalance(mode: string | null | undefined): boolean {
 return mode === "unifiedAccount" || mode === "portfolioMargin";
}
