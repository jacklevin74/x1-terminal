import { createFileRoute } from "@tanstack/react-router";
import { TournamentPage } from "@/components/tournament/tournament-page";
import { ROUTE_SEO } from "@/config/seo";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/tournament")({
	ssr: false,
	head: () => buildPageHead(ROUTE_SEO.TOURNAMENT),
	component: TournamentPage,
});
