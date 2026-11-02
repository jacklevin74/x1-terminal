import { createFileRoute } from "@tanstack/react-router";
import { LogoLockup2Gallery } from "@/components/dev-variants/logo-lockup-2/gallery";

export const Route = createFileRoute("/dev/variants/logo-lockup-2")({
	ssr: false,
	component: LogoLockup2Gallery,
});
