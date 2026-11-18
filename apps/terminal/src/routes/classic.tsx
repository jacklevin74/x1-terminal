import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { writeThemePreference } from "@/components/newtheme/theme-mode";
import { TradeTerminalPage } from "@/components/trade/trade-terminal-page";
import { buildPageHead } from "@/lib/seo";

function ClassicPage() {
	// Visiting /classic picks the classic look for the rest of the terminal too (the "New theme" button undoes it).
	useEffect(() => writeThemePreference("classic"), []);
	return <TradeTerminalPage />;
}

export const Route = createFileRoute("/classic")({
	ssr: false,
	head: () => buildPageHead({ title: "Classic theme", path: "/classic", noIndex: true }),
	component: ClassicPage,
});
