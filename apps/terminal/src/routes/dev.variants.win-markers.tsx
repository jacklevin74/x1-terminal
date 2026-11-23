import { createFileRoute } from "@tanstack/react-router";
import { WinMarkersGallery } from "@/components/dev-variants/win-markers/gallery";

export const Route = createFileRoute("/dev/variants/win-markers")({
	ssr: false,
	component: WinMarkersGallery,
});
