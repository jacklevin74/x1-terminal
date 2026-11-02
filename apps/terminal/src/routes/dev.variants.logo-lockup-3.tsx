import { createFileRoute } from "@tanstack/react-router";
import { LogoLockup3Gallery } from "@/components/dev-variants/logo-lockup-3/gallery";

export const Route = createFileRoute("/dev/variants/logo-lockup-3")({
	ssr: false,
	component: LogoLockup3Gallery,
});
