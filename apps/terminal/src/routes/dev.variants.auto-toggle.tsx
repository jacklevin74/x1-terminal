import { createFileRoute } from "@tanstack/react-router";
import { AutoToggleGallery } from "@/components/dev-variants/auto-toggle/gallery";

export const Route = createFileRoute("/dev/variants/auto-toggle")({
	ssr: false,
	component: AutoToggleGallery,
});
