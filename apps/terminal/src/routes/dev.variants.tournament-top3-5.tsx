import { createFileRoute } from "@tanstack/react-router";
import { TournamentTop35Gallery } from "@/components/dev-variants/tournament-top3-5/gallery";

export const Route = createFileRoute("/dev/variants/tournament-top3-5")({
	ssr: false,
	component: TournamentTop35Gallery,
});
