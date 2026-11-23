import { createFileRoute } from "@tanstack/react-router";
import { TournamentRank3Gallery } from "@/components/dev-variants/tournament-rank-3/gallery";

export const Route = createFileRoute("/dev/variants/tournament-rank-3")({
	ssr: false,
	component: TournamentRank3Gallery,
});
