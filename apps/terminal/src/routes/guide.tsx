import { createFileRoute } from "@tanstack/react-router";
import { GuidePage } from "@/components/guide/guide-page";
import { buildPageHead } from "@/lib/seo";
export const Route = createFileRoute("/guide")({
	ssr: false,
	head: () => buildPageHead({ title: "User Guide", path: "/guide" }),
	component: GuidePage,
});
