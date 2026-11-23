import { createFileRoute } from "@tanstack/react-router";
import { LogoX1MarkGallery } from "@/components/dev-variants/logo-x1mark/gallery";

export const Route = createFileRoute("/dev/variants/logo-x1mark")({
	ssr: false,
	component: LogoX1MarkGallery,
});
