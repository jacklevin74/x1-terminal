import { createFileRoute } from "@tanstack/react-router";
import { AutoTabGallery } from "@/components/dev-variants/auto-tab/gallery";

export const Route = createFileRoute("/dev/variants/auto-tab")({
	ssr: false,
	component: AutoTabGallery,
});
