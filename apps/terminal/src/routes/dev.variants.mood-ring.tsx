import { createFileRoute } from "@tanstack/react-router";
import { MoodRingGallery } from "@/components/dev-variants/mood-ring/gallery";

export const Route = createFileRoute("/dev/variants/mood-ring")({
	ssr: false,
	component: MoodRingGallery,
});
