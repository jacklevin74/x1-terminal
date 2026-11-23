import { createFileRoute } from "@tanstack/react-router";
import { TournamentTop3Gallery } from "@/components/dev-variants/tournament-top3/gallery";

export const Route = createFileRoute("/dev/variants/tournament-top3")({
	ssr: false,
	component: TournamentTop3Gallery,
});
