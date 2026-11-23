import { createFileRoute } from "@tanstack/react-router";
import { TournamentTop33Gallery } from "@/components/dev-variants/tournament-top3-3/gallery";

export const Route = createFileRoute("/dev/variants/tournament-top3-3")({
	ssr: false,
	component: TournamentTop33Gallery,
});
