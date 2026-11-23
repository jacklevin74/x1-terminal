import { createFileRoute } from "@tanstack/react-router";
import { TournamentTop36Gallery } from "@/components/dev-variants/tournament-top3-6/gallery";

export const Route = createFileRoute("/dev/variants/tournament-top3-6")({
	ssr: false,
	component: TournamentTop36Gallery,
});
