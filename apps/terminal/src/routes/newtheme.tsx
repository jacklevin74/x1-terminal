import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { NewthemePage } from "@/components/newtheme/newtheme-page";
import { writeThemePreference } from "@/components/newtheme/theme-mode";
import { buildPageHead } from "@/lib/seo";
export const Route = createFileRoute("/newtheme")({
	ssr: false,
	validateSearch: (search: Record<string, unknown>): { scope?: "all" | "perp" | "spot" | "builders-perp" } => {
		const scope = search.scope;
		return scope === "all" || scope === "perp" || scope === "spot" || scope === "builders-perp" ? { scope } : {};
	},
	head: () => buildPageHead({ title: "New theme", path: "/newtheme", noIndex: true }),
	component: NewthemeRoute,
});

/** /newtheme is the new theme (now the default); visiting it also clears a saved classic choice. */
function NewthemeRoute() {
	useEffect(() => writeThemePreference("new"), []);
	return <NewthemePage />;
}
