import { createFileRoute } from "@tanstack/react-router";
import { LogoLockup7Gallery } from "@/components/dev-variants/logo-lockup-7/gallery";

export const Route = createFileRoute("/dev/variants/logo-lockup-7")({
	ssr: false,
	component: LogoLockup7Gallery,
});
