import { createFileRoute } from "@tanstack/react-router";
import { isTab } from "@/components/dev-variants/portfolio/data";
import { type FrameSearch, Portfolio2Frame, Portfolio2Gallery } from "@/components/dev-variants/portfolio-2/gallery";

export const Route = createFileRoute("/dev/variants/portfolio-2")({
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
	if (search.frame) return <Portfolio2Frame {...search} />;
	return <Portfolio2Gallery />;
}
