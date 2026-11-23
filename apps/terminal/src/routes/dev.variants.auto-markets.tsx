import { createFileRoute } from "@tanstack/react-router";
import { AutoMarketsGallery } from "@/components/dev-variants/auto-markets/gallery";

export const Route = createFileRoute("/dev/variants/auto-markets")({
	ssr: false,
	component: AutoMarketsGallery,
});
