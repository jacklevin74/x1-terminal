import { createFileRoute } from "@tanstack/react-router";
import { LogoLockup4Gallery } from "@/components/dev-variants/logo-lockup-4/gallery";

export const Route = createFileRoute("/dev/variants/logo-lockup-4")({
	ssr: false,
	component: LogoLockup4Gallery,
});
