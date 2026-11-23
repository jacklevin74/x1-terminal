import { createFileRoute } from "@tanstack/react-router";
import { MoodTradersGallery } from "@/components/dev-variants/mood-traders/gallery";

export const Route = createFileRoute("/dev/variants/mood-traders")({
	ssr: false,
	component: MoodTradersGallery,
});
