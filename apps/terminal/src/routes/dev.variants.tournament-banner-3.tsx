import { createFileRoute } from "@tanstack/react-router";
import { TournamentBanner3Gallery } from "@/components/dev-variants/tournament-banner-3/gallery";

export const Route = createFileRoute("/dev/variants/tournament-banner-3")({
	ssr: false,
	component: TournamentBanner3Gallery,
});
