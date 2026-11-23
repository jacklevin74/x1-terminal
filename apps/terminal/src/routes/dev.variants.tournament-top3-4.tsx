import { createFileRoute } from "@tanstack/react-router";
import { TournamentTop34Gallery } from "@/components/dev-variants/tournament-top3-4/gallery";

export const Route = createFileRoute("/dev/variants/tournament-top3-4")({
	ssr: false,
	component: TournamentTop34Gallery,
});
