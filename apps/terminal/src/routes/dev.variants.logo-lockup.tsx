import { createFileRoute } from "@tanstack/react-router";
import { LogoLockupGallery } from "@/components/dev-variants/logo-lockup/gallery";

export const Route = createFileRoute("/dev/variants/logo-lockup")({
	ssr: false,
	component: LogoLockupGallery,
});
