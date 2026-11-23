import { createFileRoute } from "@tanstack/react-router";
import { LogoStandoutGallery } from "@/components/dev-variants/logo-standout/gallery";

export const Route = createFileRoute("/dev/variants/logo-standout")({
	ssr: false,
	component: LogoStandoutGallery,
});
