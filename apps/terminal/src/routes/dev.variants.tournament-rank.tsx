import { createFileRoute } from "@tanstack/react-router";
import { TournamentRankGallery } from "@/components/dev-variants/tournament-rank/gallery";

export const Route = createFileRoute("/dev/variants/tournament-rank")({
	ssr: false,
	component: TournamentRankGallery,
});
