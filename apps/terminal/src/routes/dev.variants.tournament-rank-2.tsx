import { createFileRoute } from "@tanstack/react-router";
import { TournamentRank2Gallery } from "@/components/dev-variants/tournament-rank-2/gallery";

export const Route = createFileRoute("/dev/variants/tournament-rank-2")({
	ssr: false,
	component: TournamentRank2Gallery,
});
