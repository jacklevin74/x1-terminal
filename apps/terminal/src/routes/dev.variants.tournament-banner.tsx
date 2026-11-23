import { createFileRoute } from "@tanstack/react-router";
import { TournamentBannerGallery } from "@/components/dev-variants/tournament-banner/gallery";

export const Route = createFileRoute("/dev/variants/tournament-banner")({
	ssr: false,
	component: TournamentBannerGallery,
});
