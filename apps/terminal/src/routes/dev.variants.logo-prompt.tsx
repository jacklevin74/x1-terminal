import { createFileRoute } from "@tanstack/react-router";
import { LogoPromptGallery } from "@/components/dev-variants/logo-prompt/gallery";

export const Route = createFileRoute("/dev/variants/logo-prompt")({
	ssr: false,
	component: LogoPromptGallery,
});
