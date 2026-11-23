import { createFileRoute } from "@tanstack/react-router";
import { PortfolioHeader2Gallery } from "@/components/dev-variants/portfolio-header-2/gallery";

export const Route = createFileRoute("/dev/variants/portfolio-header-2")({
	ssr: false,
	component: PortfolioHeader2Gallery,
});
