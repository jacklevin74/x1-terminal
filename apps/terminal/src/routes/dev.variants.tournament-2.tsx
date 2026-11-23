import { createFileRoute } from "@tanstack/react-router";
import { Tournament2Gallery } from "@/components/dev-variants/tournament-2/gallery";

export const Route = createFileRoute("/dev/variants/tournament-2")({
	ssr: false,
	component: Tournament2Gallery,
});
