import { createFileRoute } from "@tanstack/react-router";
import { LogoLockup9Gallery } from "@/components/dev-variants/logo-lockup-9/gallery";

export const Route = createFileRoute("/dev/variants/logo-lockup-9")({
	ssr: false,
	component: LogoLockup9Gallery,
});
