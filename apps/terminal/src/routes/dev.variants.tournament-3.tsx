import { createFileRoute } from "@tanstack/react-router";
import { Tournament3Gallery } from "@/components/dev-variants/tournament-3/gallery";

export const Route = createFileRoute("/dev/variants/tournament-3")({
	ssr: false,
	component: Tournament3Gallery,
});
