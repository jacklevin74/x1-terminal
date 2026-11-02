import { createFileRoute } from "@tanstack/react-router";
import { LogoLockup8Gallery } from "@/components/dev-variants/logo-lockup-8/gallery";

export const Route = createFileRoute("/dev/variants/logo-lockup-8")({
	ssr: false,
	component: LogoLockup8Gallery,
});
