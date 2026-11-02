import { createFileRoute } from "@tanstack/react-router";
import { LogoLockup5Gallery } from "@/components/dev-variants/logo-lockup-5/gallery";

export const Route = createFileRoute("/dev/variants/logo-lockup-5")({
	ssr: false,
	component: LogoLockup5Gallery,
});
