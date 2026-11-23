import { createFileRoute } from "@tanstack/react-router";
import { TournamentBanner2Gallery } from "@/components/dev-variants/tournament-banner-2/gallery";

export const Route = createFileRoute("/dev/variants/tournament-banner-2")({
	ssr: false,
	component: TournamentBanner2Gallery,
});
