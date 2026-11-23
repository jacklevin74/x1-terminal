import { createFileRoute } from "@tanstack/react-router";
import { LogoDrawnGallery } from "@/components/dev-variants/logo-drawn/gallery";

export const Route = createFileRoute("/dev/variants/logo-drawn")({
	ssr: false,
	component: LogoDrawnGallery,
});
