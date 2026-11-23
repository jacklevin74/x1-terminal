import { createFileRoute } from "@tanstack/react-router";
import { TournamentRaceGallery } from "@/components/dev-variants/tournament-race/gallery";

export const Route = createFileRoute("/dev/variants/tournament-race")({
	ssr: false,
	component: TournamentRaceGallery,
});
