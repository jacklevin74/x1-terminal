import { createFileRoute } from "@tanstack/react-router";
import { AutoHeaderGallery } from "@/components/dev-variants/auto-header/gallery";

export const Route = createFileRoute("/dev/variants/auto-header")({
	ssr: false,
	component: AutoHeaderGallery,
});
