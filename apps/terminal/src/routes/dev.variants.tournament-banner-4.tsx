import { createFileRoute } from "@tanstack/react-router";
import { TournamentBanner4Gallery } from "@/components/dev-variants/tournament-banner-4/gallery";

export const Route = createFileRoute("/dev/variants/tournament-banner-4")({
	ssr: false,
	component: TournamentBanner4Gallery,
});
