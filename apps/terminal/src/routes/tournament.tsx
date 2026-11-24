import { createFileRoute } from "@tanstack/react-router";
import { isAddress } from "viem";
import { TournamentPage } from "@/components/tournament/tournament-page";
import { ROUTE_SEO } from "@/config/seo";
import { buildPageHead } from "@/lib/seo";

interface TournamentSearch {
	trader?: string;
}

export const Route = createFileRoute("/tournament")({
	ssr: false,
	validateSearch: (s: Record<string, unknown>): TournamentSearch =>
		typeof s.trader === "string" && isAddress(s.trader) ? { trader: s.trader.toLowerCase() } : {},
	head: () => buildPageHead(ROUTE_SEO.TOURNAMENT),
	component: TournamentPage,
});
