import { createFileRoute } from "@tanstack/react-router";
import { SubAccountsGallery } from "@/components/dev-variants/sub-accounts/gallery";

export const Route = createFileRoute("/dev/variants/sub-accounts")({
	ssr: false,
	component: SubAccountsGallery,
});
