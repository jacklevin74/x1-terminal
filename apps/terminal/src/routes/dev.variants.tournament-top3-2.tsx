import { createFileRoute } from "@tanstack/react-router";
import { TournamentTop32Gallery } from "@/components/dev-variants/tournament-top3-2/gallery";

export const Route = createFileRoute("/dev/variants/tournament-top3-2")({
	ssr: false,
	component: TournamentTop32Gallery,
});
