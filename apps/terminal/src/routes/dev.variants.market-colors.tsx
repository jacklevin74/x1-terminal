import { createFileRoute } from "@tanstack/react-router";
import { MarketColorsGallery } from "@/components/dev-variants/market-colors/gallery";

export const Route = createFileRoute("/dev/variants/market-colors")({
	ssr: false,
	component: MarketColorsGallery,
});
