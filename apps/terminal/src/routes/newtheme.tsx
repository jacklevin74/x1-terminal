import { createFileRoute } from "@tanstack/react-router";
import { NewthemePage } from "@/components/newtheme/newtheme-page";
import { buildPageHead } from "@/lib/seo";
export const Route = createFileRoute("/newtheme")({
 ssr: false,
 validateSearch: (search: Record<string, unknown>): { scope?: "all" | "perp" | "spot" | "builders-perp" } => {
  const scope = search.scope;
  return scope === "all" || scope === "perp" || scope === "spot" || scope === "builders-perp" ? { scope } : {};
 },
 head: () => buildPageHead({ title: "New theme preview", path: "/newtheme", noIndex: true }),
 component: NewthemePage,
});
