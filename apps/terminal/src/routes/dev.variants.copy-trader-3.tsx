import { createFileRoute } from "@tanstack/react-router";
import {
	CopyTrader3Frame,
	CopyTrader3Gallery,
	type FrameSearch,
} from "@/components/dev-variants/copy-trader-3/gallery";

export const Route = createFileRoute("/dev/variants/copy-trader-3")({
	ssr: false,
	validateSearch: (s: Record<string, unknown>): FrameSearch => ({
		frame: s.frame === "desktop" || s.frame === "mobile" ? s.frame : undefined,
		v: typeof s.v === "number" ? s.v : Number(s.v) || undefined,
		open: s.open === "directory" || s.open === "basket" || s.open === "add" ? s.open : undefined,
		edited: s.edited === true || s.edited === "true" || undefined,
		detail: s.detail === true || s.detail === "true" || undefined,
	}),
	component: Page,
});

function Page() {
	const search = Route.useSearch();
	if (search.frame) return <CopyTrader3Frame {...search} />;
	return <CopyTrader3Gallery />;
}
