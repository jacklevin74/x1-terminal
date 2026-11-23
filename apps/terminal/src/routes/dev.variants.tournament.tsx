import { createFileRoute } from "@tanstack/react-router";
import { TournamentGallery } from "@/components/dev-variants/tournament/gallery";

export const Route = createFileRoute("/dev/variants/tournament")({
	ssr: false,
	component: TournamentGallery,
});
