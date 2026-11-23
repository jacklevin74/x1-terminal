import { createFileRoute } from "@tanstack/react-router";
import { AutoGuardGallery } from "@/components/dev-variants/auto-guard/gallery";

export const Route = createFileRoute("/dev/variants/auto-guard")({
	ssr: false,
	component: AutoGuardGallery,
});
