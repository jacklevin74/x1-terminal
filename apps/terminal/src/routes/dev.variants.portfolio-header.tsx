import { createFileRoute } from "@tanstack/react-router";
import { PortfolioHeaderGallery } from "@/components/dev-variants/portfolio-header/gallery";

export const Route = createFileRoute("/dev/variants/portfolio-header")({
	ssr: false,
	component: PortfolioHeaderGallery,
});
