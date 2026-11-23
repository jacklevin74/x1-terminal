import { createFileRoute } from "@tanstack/react-router";
import { isTab } from "@/components/dev-variants/portfolio/data";
import { type FrameSearch, PortfolioFrame, PortfolioGallery } from "@/components/dev-variants/portfolio/gallery";

export const Route = createFileRoute("/dev/variants/portfolio")({
	ssr: false,
	validateSearch: (s: Record<string, unknown>): FrameSearch => ({
		frame: s.frame === "desktop" || s.frame === "mobile" ? s.frame : undefined,
		v: typeof s.v === "number" ? s.v : Number(s.v) || undefined,
		tab: isTab(s.tab) ? s.tab : undefined,
	}),
	component: Page,
});

function Page() {
	const search = Route.useSearch();
	if (search.frame) return <PortfolioFrame {...search} />;
	return <PortfolioGallery />;
}
