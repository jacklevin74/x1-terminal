import { createFileRoute } from "@tanstack/react-router";
import { AutoGuard2Gallery } from "@/components/dev-variants/auto-guard-2/gallery";

export const Route = createFileRoute("/dev/variants/auto-guard-2")({
	ssr: false,
	component: AutoGuard2Gallery,
});
