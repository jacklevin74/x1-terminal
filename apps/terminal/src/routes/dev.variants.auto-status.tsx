import { createFileRoute } from "@tanstack/react-router";
import { AutoStatusGallery } from "@/components/dev-variants/auto-status/gallery";

export const Route = createFileRoute("/dev/variants/auto-status")({
	ssr: false,
	component: AutoStatusGallery,
});
