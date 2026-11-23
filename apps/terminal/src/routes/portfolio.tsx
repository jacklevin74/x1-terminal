import { createFileRoute } from "@tanstack/react-router";
import { PortfolioPage } from "@/components/portfolio/portfolio-page";
import { ROUTE_SEO } from "@/config/seo";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/portfolio")({
	ssr: false,
	head: () => buildPageHead(ROUTE_SEO.PORTFOLIO),
	component: PortfolioPage,
});
